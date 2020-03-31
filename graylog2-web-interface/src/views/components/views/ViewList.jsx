import React, { useEffect, useState } from 'react';
import PropTypes from 'prop-types';
import { ButtonToolbar, DropdownButton, MenuItem } from 'components/graylog';
import IfPermitted from 'components/common/IfPermitted';

import { PaginatedList, SearchForm, Spinner, EntityList } from 'components/common';
import View from './View';

const itemActionsFactory = (view, onViewDelete) => {
  return (
    <IfPermitted permissions={[`view:edit:${view.id}`, 'view:edit']} anyPermissions>
      <ButtonToolbar>
        <DropdownButton title="Actions" id={`view-actions-dropdown-${view.id}`} bsSize="small" pullRight>
          <MenuItem onSelect={onViewDelete(view)}>Delete</MenuItem>
        </DropdownButton>
      </ButtonToolbar>
    </IfPermitted>
  );
};

const ViewList = ({ pagination, handleSearch, handleViewDelete, views }) => {
  const [query, setQuery] = useState('');
  const [page, setPage] = useState(1);
  const [perPage, setPerPage] = useState(10);

  const execSearch = (resetLoadingState = () => {}) => {
    handleSearch(query, page, perPage).then(resetLoadingState).catch(resetLoadingState);
  };

  useEffect(() => {
    execSearch();
  }, [query, page, setPage]);


  const onSearch = (newQuery, resetLoadingState) => {
    setQuery(newQuery);
    setPage(1);
    resetLoadingState();
  };

  const onSearchReset = () => {
    setQuery('');
    setPage(1);
  };

  const onPageChange = (newPage, newPerPage) => {
    setPage(newPage);
    setPerPage(newPerPage);
  };

  const onViewDelete = (view) => {
    return () => {
      handleViewDelete(view).then(() => {
        setPage(1);
        execSearch();
      });
    };
  };

  if (!views) {
    return <Spinner text="Loading views..." />;
  }

  const items = views.map((view) => (
    <View key={`view-${view.id}`}
          id={view.id}
          owner={view.owner}
          createdAt={view.created_at}
          title={view.title}
          summary={view.summary}
          requires={view.requires}
          description={view.description}>
      {itemActionsFactory(view, onViewDelete)}
    </View>
  ));

  return (
    <PaginatedList onChange={onPageChange}
                   activePage={pagination.page}
                   totalItems={pagination.total}
                   pageSize={pagination.perPage}
                   pageSizes={[10, 50, 100]}>
      <div style={{ marginBottom: 15 }}>
        <SearchForm onSearch={onSearch}
                    onReset={onSearchReset}
                    topMargin={0} />
      </div>
      <EntityList items={items}
                  bsNoItemsStyle="success"
                  noItemsText="There are no views present/matching the filter!" />
    </PaginatedList>
  );
};

ViewList.propTypes = {
  views: PropTypes.arrayOf(PropTypes.object),
  pagination: PropTypes.shape({
    total: PropTypes.number.isRequired,
    page: PropTypes.number.isRequired,
    perPage: PropTypes.number.isRequired,
  }).isRequired,
  handleSearch: PropTypes.func.isRequired,
  handleViewDelete: PropTypes.func.isRequired,
};

ViewList.defaultProps = {
  views: undefined,
};

export default ViewList;
