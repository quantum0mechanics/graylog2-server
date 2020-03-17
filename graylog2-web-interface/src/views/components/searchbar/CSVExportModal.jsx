// @flow strict
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from 'views/components/CustomPropTypes';
import * as Immutable from 'immutable';
import styled from 'styled-components';

import type { ViewStoreState } from 'views/stores/ViewStore';

import connect from 'stores/connect';
import { FieldTypesStore } from 'views/stores/FieldTypesStore';
import SortDirectionSelect from 'views/components/widgets/SortDirectionSelect';
import { defaultCompare } from 'views/logic/DefaultCompare';
import URLUtils from 'util/URLUtils';
import { Modal, Button, Row } from 'components/graylog';
import BootstrapModalWrapper from 'components/bootstrap/BootstrapModalWrapper';
import FieldSortSelect from 'views/components/widgets/FieldSortSelect';
import SortableSelect from 'views/components/aggregationbuilder/SortableSelect';

import Select from 'views/components/Select';
import FieldTypeMapping from 'views/logic/fieldtypes/FieldTypeMapping';

const ValueComponent = styled.span`
  padding: 2px 5px;
`;

type Props = {
  fields: Immutable.List<FieldTypeMapping>,
  closeModal: () => void,
  currentWidgetId?: string,
  view: ViewStoreState
};

const Content = styled.div`
  margin-left: 10px;
  margin-right: 10px;
`;

// const wrapOption = o => ({ label: o, value: o });
// const wrapOption = o => ({ field: o });
const defaultFields = ['timestamp', 'source', 'message'];
// const defaultFieldOptions = defaultFields.map(wrapOption);

const infoText = (URLUtils.areCredentialsInURLSupported()
  ? 'Please right click the download link below and choose "Save Link As..." to download the CSV file.'
  : 'Please click the download link below. Your browser may ask for your username and password to '
    + 'download the CSV file.');

const _onSortDirectionChange = (newDirection, selectedSort, setSelectedSort) => {
  const newSort = selectedSort.map(sort => sort.toBuilder().direction(newDirection).build());
  setSelectedSort(newSort);
};

const _widgetLabel = (widgetTitles, widgetId) => {
  return widgetId;
  // return widgetTitles.get(widgetId);
};

const CSVExportModal = ({ closeModal, fields, view, currentWidgetId }: Props) => {
  const messageWidgets = view.view.state.reduce((result, viewState) => {
    let stateWidgets = Immutable.Map();
    viewState.widgets.forEach((widget) => {
      if (widget.type === 'messages') {
        stateWidgets = stateWidgets.set(widget.id, widget);
      }
    });
    return result.merge(stateWidgets);
  }, Immutable.Map());
  const widgetTitles = view.view.state.reduce((result, viewState) => {
    const stateTitles = Immutable.Map();
    // viewState.titles.get('widget').forEach((title, key) => {
    //   stateTitles = stateTitles.set(key, title);
    // });
    return result.merge(stateTitles);
  }, Immutable.Map());

  const currentWidget = currentWidgetId ? messageWidgets.find(widget => widget.id === currentWidgetId) : messageWidgets.first();


  const widgetOptions = messageWidgets.map(widget => ({ label: _widgetLabel(widgetTitles, widget.id), value: widget }));


  const [selectedFields, setSelectedFields] = useState(currentWidget ? currentWidget.config.fields.map(fieldName => ({ field: fieldName })) : defaultFields.map(fieldName => ({ field: fieldName })));
  const [selectedWidget, setSelectedWidget] = useState(null);
  const [selectedSort, setSelectedSort] = useState(currentWidget ? currentWidget.config.sort : []);
  const [sortDirection] = (selectedSort || []).map(s => s.direction);
  const multiSelect = !currentWidgetId && messageWidgets.size > 1;

  const _onApplyWidgetSettings = ({ value: newWidget }) => {
    setSelectedWidget(newWidget);
    setSelectedFields(newWidget.config.fields.map(fieldName => ({ field: fieldName })));
    setSelectedSort(newWidget.config.sort);
  };

  const _onFieldSelect = (newFields) => {
    setSelectedFields(newFields.map(field => ({ field: field.value })));
  };

  const _onSortSelect = (newSort) => {
    setSelectedSort(newSort);
  };

  const fieldsForSelect = fields
    .map(fieldType => fieldType.name)
    .map(fieldName => ({ label: fieldName, value: fieldName }))
    .valueSeq()
    .toJS()
    .sort((v1, v2) => defaultCompare(v1.label, v2.label));

  const startDownload = () => {};
  return (
    <BootstrapModalWrapper showModal>
      <Modal.Header>
        <Modal.Title>Export search results as CSV</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Content>
          <Row>
            <p>{infoText}</p>
          </Row>
          {multiSelect && (
            <Row>
              <span>Adopt message table settings:</span>
              <Select placeholder="Select widget to adopt settings"
                      onChange={selection => _onApplyWidgetSettings(selection)}
                      options={widgetOptions}
                      value={selectedWidget ? { value: selectedWidget, label: selectedWidget.id } : null} />
            </Row>
          )}
          <Row>
            <span>Select fields to export:</span>
            <SortableSelect options={fieldsForSelect}
                            onChange={newFields => _onFieldSelect(newFields)}
                            valueComponent={({ children: _children }) => <ValueComponent>{_children}</ValueComponent>}
                            value={selectedFields} />
          </Row>
          <Row>
            <span>Select sort:</span>
            <FieldSortSelect fields={fields} sort={selectedSort} onChange={sort => _onSortSelect(sort)} />
          </Row>
          <Row>
            <span>Select sort direction:</span>
            <SortDirectionSelect direction={sortDirection ? sortDirection.direction : null}
                                 onChange={newDirection => _onSortDirectionChange(newDirection, selectedSort, setSelectedSort)} />
          </Row>
        </Content>
      </Modal.Body>
      <Modal.Footer>
        <Button type="button" onClick={closeModal}>Close</Button>
        <Button type="button" onClick={startDownload} bsStyle="primary">Start Download</Button>
      </Modal.Footer>
    </BootstrapModalWrapper>
  );
};

CSVExportModal.propTypes = {
  closeModal: PropTypes.func,
  fields: CustomPropTypes.FieldListType.isRequired,
  currentWidgetId: PropTypes.string,
};

CSVExportModal.defaultProps = {
  closeModal: () => {},
  currentWidgetId: null,
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
