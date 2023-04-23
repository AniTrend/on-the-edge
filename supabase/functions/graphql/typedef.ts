import { gql } from 'x/graphql_tag';

export const typeDefs = gql`
  type Query {
    hello: String
  }
`;
