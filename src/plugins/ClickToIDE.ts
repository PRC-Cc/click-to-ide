import type { PluginPass, PluginObj } from "@babel/core";
import type {
  JSXAttribute,
  JSXIdentifier,
  JSXMemberExpression,
  JSXNamespacedName,
  JSXOpeningElement,
  Node,
} from "@babel/types";
import { types } from "@babel/core";
import type { Visitor } from "@babel/traverse";

const { jsxAttribute, jsxIdentifier, stringLiteral } = types;

const isNil = (value: any): value is null | undefined =>
  value === null || value === undefined;

function getJSXMemberExpressionName(
  node: JSXMemberExpression | JSXIdentifier
): string {
  if (node.type === "JSXIdentifier") {
    return node.name;
  } else if (node.type === "JSXMemberExpression") {
    return `${getJSXMemberExpressionName(
      node.object
    )}.${getJSXMemberExpressionName(node.property)}`;
  }
  return "";
}

/**
 * simple path match method, only use string and regex
 */
export const pathMatch = (
  filePath: string,
  matches?: (string | RegExp)[]
): boolean => {
  if (!matches?.length) return false;

  return matches.some((match) => {
    if (typeof match === "string") {
      return filePath.includes(match);
    } else if (match instanceof RegExp) {
      return match.test(filePath);
    }
    // default is do not filter when match is illegal, so return true
    return true;
  });
};

type NodeHandler<T = Node, O = void> = (
  node: T,
  option: O
) => {
  /**
   * stop processing flag
   */
  stop?: boolean;

  /**
   * throw error
   */
  error?: any;

  /**
   * node after processing
   */
  result?: Node;
};

const doJSXIdentifierName: NodeHandler<JSXIdentifier> = (name) => {
  if (name.name.endsWith("Fragment")) {
    return { stop: true };
  }
  return { stop: false };
};

const doJSXMemberExpressionName: NodeHandler<JSXMemberExpression> = (name) => {
  return doJSXIdentifierName(name.property);
};

const doJSXNamespacedNameName: NodeHandler<JSXNamespacedName> = (name) => {
  return doJSXIdentifierName(name.name);
};

type ElementTypes = JSXOpeningElement["name"]["type"];

const doJSXPathName: NodeHandler<JSXOpeningElement["name"]> = (name) => {
  const visitors: { [key in ElementTypes]: NodeHandler } = {
    JSXIdentifier: doJSXIdentifierName,
    JSXMemberExpression: doJSXMemberExpressionName,
    JSXNamespacedName: doJSXNamespacedNameName,
  };

  return visitors[name.type](name);
};

export const doJSXOpeningElement: NodeHandler<
  JSXOpeningElement,
  { filePath: string }
> = (node, option) => {
  const { stop } = doJSXPathName(node.name);
  if (stop) return { stop };

  const { filePath } = option;
  const line = node.loc?.start.line;
  const column = node.loc?.start.column;

  const lineAttr: JSXAttribute | null = isNil(line)
    ? null
    : jsxAttribute(
        jsxIdentifier("data-inspector-line"),
        stringLiteral(line.toString())
      );

  const columnAttr: JSXAttribute | null = isNil(column)
    ? null
    : jsxAttribute(
        jsxIdentifier("data-inspector-column"),
        stringLiteral(column.toString())
      );

  const filePathAttr: JSXAttribute = jsxAttribute(
    jsxIdentifier("data-inspector-file-path"),
    stringLiteral(filePath)
  );

  const attributes = [lineAttr, columnAttr, filePathAttr] as JSXAttribute[];

  if (attributes.every(Boolean)) {
    node.attributes.unshift(...attributes);
  }

  return { result: node };
};

export const createVisitor = (): Visitor<PluginPass> => {
  const visitor: Visitor<PluginPass> = {
    JSXOpeningElement: {
      enter(path, state: PluginPass) {
        const filePath = state?.file?.opts?.filename;
        if (!filePath) return;

        doJSXOpeningElement(path.node, {
          filePath,
        });
      },
    },
    ImportDeclaration(path) {
      const { node } = path;
      const specifiers = node.specifiers.map((item) => item.local.name);
      path.parentPath.traverse({
        JSXOpeningElement(path) {
          const { node } = path;
          const name = node.name;
          let parseName;
          let compareName;
          if (name.type === "JSXMemberExpression") {
            const fullNames = getJSXMemberExpressionName(name);
            compareName = fullNames.split(".")[0];
            parseName = fullNames;
          } else if (name.type === "JSXIdentifier") {
            parseName = name?.name;
            compareName = name?.name;
          }
          if (!compareName || !parseName) return;
          if (specifiers.includes(compareName)) {
            node.attributes.push(
              jsxAttribute(
                jsxIdentifier("__displayName"),
                stringLiteral(parseName)
              )
            );
          }
        },
      });
    },
  };

  return visitor;
};

export function InspectorBabelPlugin(): PluginObj {
  return {
    name: "click-to-ide-babel-plugin",

    visitor: createVisitor(),
  };
}

export default InspectorBabelPlugin;
