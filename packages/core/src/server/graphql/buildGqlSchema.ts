import { GraphQLFieldConfig, GraphQLObjectType, GraphQLSchema } from "graphql";

import { Schema } from "@/schema/types";
import { UserStore } from "@/user-store/store";

import { buildEntityType } from "./buildEntityType";
import { buildPluralField } from "./buildPluralField";
import { buildSingularField } from "./buildSingularField";

export type Source = { request: unknown };
export type Context = { store: UserStore };

const buildGqlSchema = (schema: Schema): GraphQLSchema => {
  const queryFields: Record<string, GraphQLFieldConfig<Source, Context>> = {};

  const entityGqlTypes: Record<string, GraphQLObjectType<Source, Context>> = {};

  // First build the entity types. These have resolvers defined for any
  // relationship or derived fields. This is also important for the thunk nonsense.
  for (const entity of schema.entities) {
    entityGqlTypes[entity.name] = buildEntityType({ entity, entityGqlTypes });
  }

  for (const entity of schema.entities) {
    const entityGqlType = entityGqlTypes[entity.name];

    const singularFieldName =
      entity.name.charAt(0).toLowerCase() + entity.name.slice(1);
    queryFields[singularFieldName] = buildSingularField({
      entity,
      entityGqlType,
    });

    const pluralFieldName = singularFieldName + "s";
    queryFields[pluralFieldName] = buildPluralField({ entity, entityGqlType });
  }

  const queryType = new GraphQLObjectType({
    name: "Query",
    fields: queryFields,
  });

  const gqlSchema = new GraphQLSchema({
    query: queryType,
  });

  return gqlSchema;
};

export { buildGqlSchema };
