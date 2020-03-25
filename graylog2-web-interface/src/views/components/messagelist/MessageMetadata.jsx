// @flow strict
import * as React from 'react';
import * as Immutable from 'immutable';

import { MessageDetailsDefinitionList } from 'components/graylog';

type Props = {
  timestamp: string,
  receivedBy: React.Node,
  index: string,
  streams: Immutable.Set<React.Node>,
};

const MessageMetadata = ({ timestamp, receivedBy, index, streams }: Props) => (
  <MessageDetailsDefinitionList>
    {timestamp}
    {receivedBy}

    <dt>Stored in index</dt>
    <dd>{index || 'Message is not stored'}</dd>

    {streams.size > 0 && (
      <React.Fragment>
        <dt>Routed into streams</dt>
        <dd className="stream-list">
          <ul>
            {streams}
          </ul>
        </dd>
      </React.Fragment>
    )}
  </MessageDetailsDefinitionList>
);

export default MessageMetadata;
