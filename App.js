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
import { onError } from "apollo-link-error";
import { Buffer } from "buffer";
import { View } from "react-native";
import { Header } from "react-native-elements";

const errorLink = onError(({ networkError, graphQLErrors }) => {
  if (graphQLErrors) {
    graphQLErrors.map(({ message, locations, path }) =>
      console.log(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      )
    );
  }
  if (networkError) console.log(`[Network error]: ${networkError}`);
});

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
  mutation sendMessage(
    $id: String!
    $text: String!
    $createdAt: String!
    $user: UserInput!
  ) {
    sendMessage(id: $id, text: $text, createdAt: $createdAt, user: $user) {
      text
    }
  }
`;

class Example extends React.Component {
  state = {
    messages: []
  };

  onSend(mutation, messages = []) {
    updated_message = messages[messages.length - 1];
    console.log(updated_message);
    let buff = Buffer.from(updated_message._id);
    let base64id = buff.toString("base64");

    mutation({
      variables: {
        id: base64id,
        text: updated_message.text,
        createdAt: updated_message.createdAt,
        user: { name: "GeorginaSoros" }
      }
    });

    this.setState(previousState => ({
      messages: GiftedChat.append(previousState.messages, messages)
    }));
  }

  onChange(e) {
    console.log(e);
  }

  updateState = message => {
    avatar_range = [...Array(20).keys()];
    var randImageId =
      avatar_range[Math.floor(Math.random() * avatar_range.length)];
    update_message = [
      {
        _id: message.id,
        text: message.text,
        user: {
          name: message.user.name,
          avatar: `https://poechat-icons.s3-us-west-2.amazonaws.com/${randImageId}.jpg`
        },
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
    <View style={{ flex: 1 }}>
      <Header
        leftComponent={{ icon: "menu", color: "#fff" }}
        centerComponent={{ text: "Path of Chatting", style: { color: "#fff" } }}
        rightComponent={{ icon: "home", color: "#fff" }}
      />
      <Example />
    </View>
  </ApolloProvider>
);

export default App;
