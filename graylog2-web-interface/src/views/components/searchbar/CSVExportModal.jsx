// @flow strict
import React, { useState } from 'react';
import { List, Set } from 'immutable';
import PropTypes from 'prop-types';
import styled from 'styled-components';
import connect from 'stores/connect';

import { exportAllMessages, exportSearchTypeMessages } from 'util/MessagesExportUtils';
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
import IfSearch from 'views/components/search/IfSearch';
import IfDashboard from 'views/components/dashboard/IfDashboard';


const _onSelectWidget = ({ value: newWidget }, setSelectedWidget, setSelectedFields, setSelectedSort) => {
  setSelectedWidget(newWidget);
  setSelectedFields(newWidget.config.fields.map(fieldName => ({ field: fieldName })));
  setSelectedSort(newWidget.config.sort);
};

const _onFieldSelect = (newFields, setSelectedFields) => {
  setSelectedFields(newFields.map(field => ({ field: field.value })));
};

const _initialWidget = (messageWidgets, fixedWidgetId, allwaysAllowWidgetSelection) => {
  if (fixedWidgetId) {
    return messageWidgets.find(widget => widget.id === fixedWidgetId);
  }
  if (!allwaysAllowWidgetSelection && messageWidgets.size === 1) {
    return messageWidgets.first();
  }
  return null;
};

type Props = {
  allwaysAllowWidgetSelection: boolean,
  closeModal: () => void,
  fixedWidgetId?: string,
  fields: List<FieldTypeMapping>,
  view: View
};

type DefaultExportPayload = {
  fields_in_order: string[],
  sort: MessageSortConfig[]
}

const Content = styled.div`
  margin-left: 15px;
  margin-right: 15px;
`;

const exportOnDashboard = (defaultExportPayload: DefaultExportPayload, searchType: any, searchId: string) => {
  if (!searchType) {
    throw new Error('CSV exports on a dashboard require a selected widget!');
  }
  const exportPayload = {
    ...defaultExportPayload,
    timerange: searchType.timerange,
    streams: searchType.streams,
    query_string: searchType.query,
  };
  exportSearchTypeMessages(exportPayload, searchId, searchType.id);
};

const exportOnSearchPage = (defaultExportPayload: DefaultExportPayload, searchQueries: Set<Query>, searchType: ?any, searchId: string) => {
  if (searchQueries.size !== 1) {
    throw new Error('Searches must only have a single query!');
  }
  const firstQuery = searchQueries.first();
  if (firstQuery) {
    const { query, timerange } = firstQuery;
    const streams = firstQuery.filter ? firstQuery.filter.get('filters').filter(filter => filter.get('type') === 'stream').map(filter => filter.get('id')).toArray() : [];
    const exportPayload = {
      ...defaultExportPayload,
      timerange,
      query_string: query,
      streams,
    };
    if (searchType) {
      exportSearchTypeMessages(exportPayload, searchId, searchType.id);
    } else {
      exportAllMessages(exportPayload);
    }
  }
};

const startDownload = (view: View, selectedWidget: ?Widget, selectedFields: { field: string }[], selectedSort: SortConfig[]) => {
  let widgetMapping;
  let searchTypes;
  let searchType;
  let searchTypeId;

  const defaultExportPayload = {
    fields_in_order: selectedFields.map(field => field.field),
    sort: selectedSort.map(sortConfig => new MessageSortConfig(sortConfig.field, sortConfig.direction)),
  };

  if (selectedWidget) {
    widgetMapping = view.state.map(state => state.widgetMapping).flatten(true);
    searchTypeId = widgetMapping.get(selectedWidget.id).first();
    searchTypes = view.search.queries.map(query => query.searchTypes).toArray().flat();
    searchType = searchTypes.find(entry => entry && entry.id && entry.id === searchTypeId);
  }

  if (view.type === View.Type.Dashboard) {
    exportOnDashboard(defaultExportPayload, searchType, view.search.id);
  }

  if (view.type === View.Type.Search) {
    exportOnSearchPage(defaultExportPayload, view.search.queries, searchType, view.search.id);
  }
};

const wrapFieldOption = field => ({ field });
const defaultFields = ['timestamp', 'source', 'message'];
const defaultFieldOptions = defaultFields.map(wrapFieldOption);

const CSVExportModal = ({ closeModal, fields, view, fixedWidgetId, allwaysAllowWidgetSelection }: Props) => {
  const { state: viewStates } = view;
  const messageWidgets = viewStates.map(state => state.widgets.filter(widget => widget.type === 'messages')).flatten(true);
  const widgetTitles = viewStates.flatMap(state => state.titles.get('widget'));
  const initialWidget = _initialWidget(messageWidgets, fixedWidgetId, allwaysAllowWidgetSelection);
  const [selectedWidget, setSelectedWidget] = useState<?Widget>(initialWidget);
  const [selectedFields, setSelectedFields] = useState<{ field: string }[]>(selectedWidget ? selectedWidget.config.fields.map(wrapFieldOption) : defaultFieldOptions);
  const [selectedSort, setSelectedSort] = useState<SortConfig[]>(selectedWidget ? selectedWidget.config.sort : defaultSort);
  const [selectedSortDirection] = (selectedSort).map(s => s.direction);
  const showWidgetSelection = !selectedWidget && messageWidgets.size !== 0;
  const showWidgetSelectionLink = selectedWidget && ((messageWidgets.size > 1 && !fixedWidgetId) || allwaysAllowWidgetSelection);
  const enableDownload = selectedWidget || messageWidgets.size === 0;
  return (
    <BootstrapModalWrapper showModal onHide={closeModal}>
      <Modal.Header>
        <Modal.Title>
          <IfSearch>
            Export all search results to CSV
          </IfSearch>
          <IfDashboard>
            Export message table search results to CSV
          </IfDashboard>
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Content>
          {showWidgetSelection && (
            <CSVExportWidgetSelection selectWidget={selection => _onSelectWidget(selection, setSelectedWidget, setSelectedFields, setSelectedSort)}
                                      viewStates={viewStates}
                                      widgetTitles={widgetTitles}
                                      widgets={messageWidgets} />
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
        {showWidgetSelectionLink && <Button bsStyle="link" onClick={() => setSelectedWidget(null)} className="pull-left">Select different message table</Button>}
        <Button type="button" onClick={closeModal}>Close</Button>
        <Button type="button" onClick={() => startDownload(view, selectedWidget, selectedFields, selectedSort)} disabled={!enableDownload} bsStyle="primary"><Icon name="cloud-download" /> Start Download</Button>
      </Modal.Footer>
    </BootstrapModalWrapper>
  );
};

CSVExportModal.propTypes = {
  allwaysAllowWidgetSelection: PropTypes.bool,
  closeModal: PropTypes.func,
  fixedWidgetId: PropTypes.string,
  fields: CustomPropTypes.FieldListType.isRequired,
};

CSVExportModal.defaultProps = {
  allwaysAllowWidgetSelection: false,
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
