import { test, expect, beforeAll } from 'vitest'
import fs from 'fs'
import path from 'path'
import { html2json } from '../src'
import { defaultTreeAdapter, parse, parseFragment } from 'parse5'
import stringify from 'json-stringify-safe'

export const getHtml = (idx: number) => {
  return fs.readFileSync(
    path.resolve(__dirname, `./fixtures/html/ex${idx}.html`),
  ).toString()
}
export const getJsonPath = (idx: number) => {
  return path.resolve(__dirname, `./fixtures/json/ex${idx}.json`)
}

test('test', () => {
  let calledMethods: Set<string> = new Set()
  // 这个例子就是 AST Explorer 里面的例子，输入输出均一模一样: https://astexplorer.net/#/1CHlCXc4n4
  expect(stringify(
    parse(
      getHtml(1),
      {
        sourceCodeLocationInfo: true,
        treeAdapter: new Proxy(defaultTreeAdapter, {
          get(target, propKey, receiver) {
            calledMethods.add(propKey.toString())
            return Reflect.get(target, propKey, receiver)
          },
        }),
      }
    ),
    null,
    2
  )).toMatchFileSnapshot(getJsonPath(1))
  // 看看哪几个函数被用到了
  expect(calledMethods).toMatchInlineSnapshot(`
    Set {
      "createDocument",
      "createCommentNode",
      "appendChild",
      "setNodeSourceCodeLocation",
      "setDocumentType",
      "getChildNodes",
      "isDocumentTypeNode",
      "setDocumentMode",
      "createElement",
      "onItemPush",
      "getNamespaceURI",
      "getNodeSourceCodeLocation",
      "onItemPop",
      "insertText",
      "updateNodeSourceCodeLocation",
      "getTagName",
    }
  `)

  // 自定义 JSON 格式
  expect(stringify(
    html2json(
      getHtml(2)
    ),
    null,
    2
  )).toMatchFileSnapshot(getJsonPath(2))

  // 自定义 JSON 格式
  expect(stringify(
    html2json(
      getHtml(3)
    ),
    null,
    2
  )).toMatchFileSnapshot(getJsonPath(3))
})
