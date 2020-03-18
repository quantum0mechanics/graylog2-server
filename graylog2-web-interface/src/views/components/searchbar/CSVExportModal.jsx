// @flow strict
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from 'views/components/CustomPropTypes';
import * as Immutable from 'immutable';
import styled from 'styled-components';

import View from 'views/logic/views/View';

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
  allwaysShowWidgetSelection: boolean,
  closeModal: () => void,
  fixedWidgetId?: string,
  fields: Immutable.List<FieldTypeMapping>,
  view: View
};

const Content = styled.div`
  margin-left: 10px;
  margin-right: 10px;
`;

const defaultFields = ['timestamp', 'source', 'message'];

const infoText = (URLUtils.areCredentialsInURLSupported()
  ? 'Please right click the download link below and choose "Save Link As..." to download the CSV file.'
  : 'Please click the download link below. Your browser may ask for your username and password to '
    + 'download the CSV file.');

const _onSortDirectionChange = (newDirection, selectedSort, setSelectedSort) => {
  const newSort = selectedSort.map(sort => sort.toBuilder().direction(newDirection).build());
  setSelectedSort(newSort);
};

const _onFieldSelect = (newFields, setSelectedFields) => {
  setSelectedFields(newFields.map(field => ({ field: field.value })));
};

const _onApplyWidgetSettings = ({ value: newWidget }, setSelectedWidget, setSelectedFields, setSelectedSort) => {
  setSelectedWidget(newWidget);
  setSelectedFields(newWidget.config.fields.map(fieldName => ({ field: fieldName })));
  setSelectedSort(newWidget.config.sort);
};

const extractMessageWidgets = (viewStates) => {
  return viewStates.reduce((result, viewState) => {
    let stateWidgets = Immutable.Map();
    viewState.widgets.forEach((widget) => {
      if (widget.type === 'messages') {
        stateWidgets = stateWidgets.set(widget.id, widget);
      }
    });
    return result.merge(stateWidgets);
  }, Immutable.Map());
};

const extractWidgetTitles = (viewStates) => {
  return viewStates.reduce((result, viewState) => {
    const widgetTitles = viewState.titles.get('widget');
    let stateTitles = Immutable.Map();
    if (widgetTitles) {
      viewState.titles.get('widget').forEach((title, key) => {
        stateTitles = stateTitles.set(key, title);
      });
    }
    return result.merge(stateTitles);
  }, Immutable.Map());
};

const CSVExportModal = ({ closeModal, fields, view: { state: viewStates }, fixedWidgetId, allwaysShowWidgetSelection }: Props) => {
  const messageWidgets = extractMessageWidgets(viewStates);
  const widgetTitles = extractWidgetTitles(viewStates);
  const currentWidget = fixedWidgetId ? messageWidgets.find(widget => widget.id === fixedWidgetId) : messageWidgets.first();
  const widgetOptions = messageWidgets.map(widget => ({ label: widgetTitles.get(widget.id) || 'Message table without title', value: widget })).toArray();
  const showWidgetSelection = allwaysShowWidgetSelection || (!fixedWidgetId && messageWidgets.size > 1);
  const [selectedFields, setSelectedFields] = useState(currentWidget ? currentWidget.config.fields.map(fieldName => ({ field: fieldName })) : null);
  const [selectedWidget, setSelectedWidget] = useState(currentWidget);
  const [selectedSort, setSelectedSort] = useState(currentWidget ? currentWidget.config.sort : []);
  const [selectedSortDirection] = (selectedSort || []).map(s => s.direction);
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
          {showWidgetSelection && (
            <Row>
              <span>Adopt message table settings:</span>
              <Select placeholder="Select widget to adopt settings"
                      onChange={selection => _onApplyWidgetSettings(selection, setSelectedWidget, setSelectedFields, setSelectedSort)}
                      options={widgetOptions}
                      value={selectedWidget ? { value: selectedWidget, label: widgetTitles.get(selectedWidget.id) || 'No widget title' } : null} />
            </Row>
          )}
          <Row>
            <span>Select fields to export:</span>
            <SortableSelect options={fieldsForSelect}
                            onChange={_onFieldSelect}
                            valueComponent={({ children: _children }) => <ValueComponent>{_children}</ValueComponent>}
                            value={selectedFields} />
          </Row>
          <Row>
            <span>Select sort:</span>
            <FieldSortSelect fields={fields} sort={selectedSort} onChange={setSelectedSort} />
          </Row>
          <Row>
            <span>Select sort direction:</span>
            <SortDirectionSelect direction={selectedSortDirection ? selectedSortDirection.direction : null}
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
  allwaysShowWidgetSelection: PropTypes.bool,
  closeModal: PropTypes.func,
  fixedWidgetId: PropTypes.string,
  fields: CustomPropTypes.FieldListType.isRequired,
};

CSVExportModal.defaultProps = {
  allwaysShowWidgetSelection: false,
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
