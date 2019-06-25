import React from "react";
import { GiftedChat } from "react-native-gifted-chat";
import { gql } from "apollo-boost";
import { split } from "apollo-link";
import { HttpLink } from "apollo-link-http";
import { WebSocketLink } from "apollo-link-ws";
import { getMainDefinition } from "apollo-utilities";
import ApolloClient from "apollo-client";
import { InMemoryCache } from "apollo-cache-inmemory";
import { ApolloProvider, Subscription, Mutation } from "react-apollo";

// Create an http link:
const httpLink = new HttpLink({
  uri: "http://192.168.1.157:4000/graphql"
});

const wsLink = new WebSocketLink({
  uri: `ws://192.168.1.157:4000/graphql`,
  options: {
    reconnect: true
  }
});

// using the ability to split links, you can send data to each link
// depending on what kind of operation is being sent
const link = split(
  // split based on operation type
  ({ query }) => {
    const definition = getMainDefinition(query);
    return (
      definition.kind === "OperationDefinition" &&
      definition.operation === "subscription"
    );
  },
  wsLink,
  httpLink
);

const client = new ApolloClient({
  link,
  cache: new InMemoryCache()
});

const COMMENTS_SUBSCRIPTION = gql`
  subscription seeMessages {
    messageRecieved {
      id
      text
      createdAt
      user {
        name
      }
    }
  }
`;

const SEND_MESSAGE = gql`
  mutation sendMessage($message: String!) {
    sendMessage(message: $message) {
      text
    }
  }
`;

class Example extends React.Component {
  state = {
    messages: []
  };

  onSend(mutation, messages = []) {
    console.log(messages[messages.length - 1].text);
    mutation({ variables: { message: messages[messages.length - 1].text } });

    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages)
    }));
  }

  onChange(e) {
    console.log(e);
  }

  updateState = message => {
    update_message = [
      {
        _id: message.id,
        text: message.text,
        user: message.user,
        createdAt: new Date(message.createdAt).toISOString()
      }
    ];
    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, update_message)
    }));
  };

  render() {
    return (
      <Mutation mutation={SEND_MESSAGE}>
        {(sendMessage, { data }) => (
          <Subscription
            subscription={COMMENTS_SUBSCRIPTION}
            onSubscriptionData={opts =>
              this.updateState(opts.subscriptionData.data.messageRecieved)
            }
          >
            {({ data, loading, error }) => {
              return (
                <GiftedChat
                  messages={this.state.messages}
                  onSend={messages => this.onSend(sendMessage, messages)}
                  showAvatarForEveryMessage={true}
                  renderUsernameOnMessage={true}
                  user={{
                    _id: 1
                  }}
                />
              );
            }}
          </Subscription>
        )}
      </Mutation>
    );
  }
}

const App = () => (
  <ApolloProvider client={client}>
    <Example />
  </ApolloProvider>
);

export default App;
