// @flow strict
import React, { useState, useContext } from 'react';
import { List, Set, Map } from 'immutable';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import connect from 'stores/connect';

import ViewTypeContext from 'views/components/contexts/ViewTypeContext';
import { exportAllMessages, exportSearchTypeMessages, type ExportPayload } from 'util/MessagesExportUtils';
import CustomPropTypes from 'views/components/CustomPropTypes';
import Widget from 'views/logic/widgets/Widget';
import Query from 'views/logic/queries/Query';
import View from 'views/logic/views/View';
import FieldTypeMapping from 'views/logic/fieldtypes/FieldTypeMapping';
import { FieldTypesStore } from 'views/stores/FieldTypesStore';
import { defaultSort } from 'views/logic/widgets/MessagesWidgetConfig';
import MessageSortConfig from 'views/logic/searchtypes/messages/MessageSortConfig';
import SortConfig from 'views/logic/aggregationbuilder/SortConfig';

import { Modal, Button } from 'components/graylog';
import { Icon } from 'components/common';
import BootstrapModalWrapper from 'components/bootstrap/BootstrapModalWrapper';
import CSVExportWidgetSelection from 'views/components/searchbar/CSVExportWidgetSelection';
import CSVExportSettings from 'views/components/searchbar/CSVExportSettings';

const Content = styled.div`
  margin-left: 15px;
  margin-right: 15px;
`;

type Props = {
  closeModal: () => void,
  fixedWidgetId?: string,
  fields: List<FieldTypeMapping>,
  view: View
};

type ExportStrategy = {
  title: string,
  shouldAllowWidgetSelection: (singleWidgetDownload: boolean, showWidgetSelection: boolean, widgets: Map<string, Widget>) => boolean,
  shouldEnableDownload: (showWidgetSelection: boolean, selectedWidget: ?Widget) => boolean,
  shouldShowWidgetSelection: (singleWidgetDownload: boolean, selectedWidget: ?Widget, widgets: Map<string, Widget>) => boolean,
  initialWidget: (widgets: Map<string, Widget>, fixedWidgetId: ?string) => ?Widget,
}

const _getWidgetById = (widgets, id) => widgets.find(item => item.id === id);

const _initialSearchWidget = (widgets, fixedWidgetId) => {
  if (fixedWidgetId) {
    return _getWidgetById(widgets, fixedWidgetId);
  }
  if (widgets.size === 1) {
    return widgets.first();
  }
  return null;
};

const SearchExportStrategy: ExportStrategy = {
  title: 'Export all search results to CSV',
  shouldEnableDownload: showWidgetSelection => !showWidgetSelection,
  shouldAllowWidgetSelection: (singleWidgetDownload, showWidgetSelection, widgets) => !singleWidgetDownload && !showWidgetSelection && widgets.size > 1,
  shouldShowWidgetSelection: (singleWidgetDownload, selectedWidget, widgets) => !singleWidgetDownload && !selectedWidget && widgets.size > 1,
  initialWidget: _initialSearchWidget,
};

const DashboardExportStrategy: ExportStrategy = {
  title: 'Export message table search results to CSV',
  shouldEnableDownload: (showWidgetSelection, selectedWidget) => !!selectedWidget,
  shouldAllowWidgetSelection: (singeWidgetDownload, showWidgetSelection) => !singeWidgetDownload && !showWidgetSelection,
  shouldShowWidgetSelection: (singeWidgetDownload, selectedWidget) => !singeWidgetDownload && !selectedWidget,
  initialWidget: (widget, fixedWidgetId) => (fixedWidgetId ? _getWidgetById(widget, fixedWidgetId) : null),
};

const _exportStrategy = () => {
  const viewType = useContext(ViewTypeContext);
  switch (viewType) {
    case View.Type.Dashboard:
      return DashboardExportStrategy;
    case View.Type.Search:
    default:
      return SearchExportStrategy;
  }
};


const _exportOnDashboard = (defaultExportPayload: ExportPayload, searchType: any, searchId: string) => {
  if (!searchType) {
    throw new Error('CSV exports on a dashboard require a selected widget!');
  }
  exportSearchTypeMessages(defaultExportPayload, searchId, searchType.id);
};

const _exportOnSearchPage = (defaultExportPayload: ExportPayload, searchQueries: Set<Query>, searchType: ?any, searchId: string) => {
  if (searchQueries.size !== 1) {
    throw new Error('Searches must only have a single query!');
  }
  const firstQuery = searchQueries.first();
  if (firstQuery) {
    if (searchType) {
      exportSearchTypeMessages(defaultExportPayload, searchId, searchType.id);
    } else {
      const { query, timerange } = firstQuery;
      const streams = firstQuery.filter ? firstQuery.filter.get('filters').filter(filter => filter.get('type') === 'stream').map(filter => filter.get('id')).toArray() : [];
      const exportPayload = {
        ...defaultExportPayload,
        timerange,
        query_string: query,
        streams,
      };
      exportAllMessages(exportPayload);
    }
  }
};

const _startDownload = (view: View, selectedWidget: ?Widget, selectedFields: { field: string }[], selectedSort: SortConfig[]) => {
  let searchType;
  const defaultExportPayload = {
    fields_in_order: selectedFields.map(field => field.field),
    sort: selectedSort.map(sortConfig => new MessageSortConfig(sortConfig.field, sortConfig.direction)),
  };

  if (selectedWidget) {
    const widgetMapping = view.state.map(state => state.widgetMapping).flatten(true);
    const searchTypeId = widgetMapping.get(selectedWidget.id).first();
    const searchTypes = view.search.queries.map(query => query.searchTypes).toArray().flat();
    searchType = searchTypes.find(entry => entry && entry.id && entry.id === searchTypeId);
  }

  if (view.type === View.Type.Dashboard) {
    _exportOnDashboard(defaultExportPayload, searchType, view.search.id);
  }

  if (view.type === View.Type.Search) {
    _exportOnSearchPage(defaultExportPayload, view.search.queries, searchType, view.search.id);
  }
};


const _onSelectWidget = ({ value: newWidget }, setSelectedWidget, setSelectedFields, setSelectedSort) => {
  setSelectedWidget(newWidget);
  setSelectedFields(newWidget.config.fields.map(fieldName => ({ field: fieldName })));
  setSelectedSort(newWidget.config.sort);
};

const _onFieldSelect = (newFields, setSelectedFields) => {
  setSelectedFields(newFields.map(field => ({ field: field.value })));
};


const _wrapFieldOption = field => ({ field });
const _defaultFields = ['timestamp', 'source', 'message'];
const _defaultFieldOptions = _defaultFields.map(_wrapFieldOption);

const CSVExportModal = ({ closeModal, fields, view, fixedWidgetId }: Props) => {
  const { state: viewStates } = view;
  const { shouldEnableDownload, title, initialWidget, shouldShowWidgetSelection, shouldAllowWidgetSelection } = _exportStrategy();
  const messagesWidgets = viewStates.map(state => state.widgets.filter(widget => widget.type === 'messages')).flatten(true);

  const [selectedWidget, setSelectedWidget] = useState<?Widget>(initialWidget(messagesWidgets, fixedWidgetId));
  const [selectedFields, setSelectedFields] = useState<{ field: string }[]>(selectedWidget ? selectedWidget.config.fields.map(_wrapFieldOption) : _defaultFieldOptions);
  const [selectedSort, setSelectedSort] = useState<SortConfig[]>(selectedWidget ? selectedWidget.config.sort : defaultSort);
  const [selectedSortDirection] = selectedSort.map(s => s.direction);

  const singleWidgetDownload = !!fixedWidgetId;
  const widgetTitles = viewStates.flatMap(state => state.titles.get('widget'));
  const showWidgetSelection = shouldShowWidgetSelection(singleWidgetDownload, selectedWidget, messagesWidgets);
  const allowWidgetSelection = shouldAllowWidgetSelection(singleWidgetDownload, showWidgetSelection, messagesWidgets);
  const enableDownload = shouldEnableDownload(showWidgetSelection, selectedWidget);

  return (
    <BootstrapModalWrapper showModal onHide={closeModal}>
      <Modal.Header>
        <Modal.Title>{title}</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Content>
          {showWidgetSelection && (
            <CSVExportWidgetSelection selectWidget={selection => _onSelectWidget(selection, setSelectedWidget, setSelectedFields, setSelectedSort)}
                                      viewStates={viewStates}
                                      widgetTitles={widgetTitles}
                                      widgets={messagesWidgets} />
          )}
          {!showWidgetSelection && (
            <CSVExportSettings fields={fields}
                               selectedFields={selectedFields}
                               selectedSort={selectedSort}
                               selectedSortDirection={selectedSortDirection}
                               selectField={newFields => _onFieldSelect(newFields, setSelectedFields)}
                               setSelectedSort={setSelectedSort}
                               selectedWidget={selectedWidget}
                               widgetTitles={widgetTitles} />
          )}
        </Content>
      </Modal.Body>
      <Modal.Footer>
        {allowWidgetSelection && <Button bsStyle="link" onClick={() => setSelectedWidget(null)} className="pull-left">Select different message table</Button>}
        <Button type="button" onClick={closeModal}>Close</Button>
        <Button type="button" onClick={() => _startDownload(view, selectedWidget, selectedFields, selectedSort)} disabled={!enableDownload} bsStyle="primary"><Icon name="cloud-download" /> Start Download</Button>
      </Modal.Footer>
    </BootstrapModalWrapper>
  );
};

CSVExportModal.propTypes = {
  closeModal: PropTypes.func,
  fixedWidgetId: PropTypes.string,
  fields: CustomPropTypes.FieldListType.isRequired,
};

CSVExportModal.defaultProps = {
  closeModal: () => {},
  fixedWidgetId: null,
};

export default connect(
  CSVExportModal,
  {
    fields: FieldTypesStore,
  },
  ({ fields: { all }, ...rest }) => ({
    ...rest,
    fields: all,
  }),
);
