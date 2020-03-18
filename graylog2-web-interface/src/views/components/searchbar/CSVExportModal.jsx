// @flow strict
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import CustomPropTypes from 'views/components/CustomPropTypes';
import * as Immutable from 'immutable';
import styled from 'styled-components';

import View from 'views/logic/views/View';

import connect from 'stores/connect';
import { FieldTypesStore } from 'views/stores/FieldTypesStore';
import { Modal, Button } from 'components/graylog';
import BootstrapModalWrapper from 'components/bootstrap/BootstrapModalWrapper';
import FieldTypeMapping from 'views/logic/fieldtypes/FieldTypeMapping';
import CSVExportWidgetSelection from 'views/components/searchbar/CSVExportWidgetSelection';
import CSVExportSettings from 'views/components/searchbar/CSVExportSettings';


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
  fields: Immutable.List<FieldTypeMapping>,
  view: View
};

const Content = styled.div`
  margin-left: 15px;
  margin-right: 15px;
`;

const CSVExportModal = ({ closeModal, fields, view: { state: viewStates }, fixedWidgetId, allwaysAllowWidgetSelection }: Props) => {
  const messageWidgets = viewStates.map(state => state.widgets.filter(widget => widget.type === 'messages')).flatten(true);
  const initialWidget = _initialWidget(messageWidgets, fixedWidgetId, allwaysAllowWidgetSelection);
  const [selectedWidget, setSelectedWidget] = useState(initialWidget);
  const [selectedFields, setSelectedFields] = useState(selectedWidget ? selectedWidget.config.fields.map(fieldName => ({ field: fieldName })) : null);
  const [selectedSort, setSelectedSort] = useState(selectedWidget ? selectedWidget.config.sort : []);
  const [selectedSortDirection] = (selectedSort || []).map(s => s.direction);
  const startDownload = () => {};

  return (
    <BootstrapModalWrapper showModal>
      <Modal.Header>
        <Modal.Title>Export to CSV</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Content>
          {!selectedWidget
            ? (
              <CSVExportWidgetSelection selectWidget={selection => _onSelectWidget(selection, setSelectedWidget, setSelectedFields, setSelectedSort)}
                                        viewStates={viewStates}
                                        widgets={messageWidgets} />
            )
            : (
              <CSVExportSettings fields={fields}
                                 selectedFields={selectedFields}
                                 selectedSort={selectedSort}
                                 selectedSortDirection={selectedSortDirection}
                                 selectField={newFields => _onFieldSelect(newFields, setSelectedFields)}
                                 setSelectedSort={setSelectedSort}
                                 selectedWidget={selectedWidget} />
            )}
        </Content>
      </Modal.Body>
      <Modal.Footer>
        {(selectedWidget && messageWidgets.size > 1 && !fixedWidgetId) && <Button bsStyle="link" onClick={() => setSelectedWidget(null)} className="pull-left">Select different widget</Button>}
        <Button type="button" onClick={closeModal}>Close</Button>
        <Button type="button" onClick={startDownload} disabled={!selectedWidget} bsStyle="primary">Start Download</Button>
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
