# parse5-to-json

使用 parse5 将 HTML 转换成自定义的 JSON 格式。

parse5 内置了一个 [`defaultTreeAdapter`](https://github.com/inikulin/parse5/blob/master/packages/parse5/lib/tree-adapters/default.ts) 用来将 HTML 转换成 JSON 格式的 AST。`defaultTreeAdapter` 的效果可以直接在 [AST Explorer](https://astexplorer.net/#/gist/b1785112fb79b22b961d17020ab12417/77f4e803c448b8198c25a7b85c1c552ceb4e11b8) 查看，下面是一个具体的例子。

- HTML: [`./test/fixtures/html/ex1.html`](./test/fixtures/html/ex1.html)
- parse 后的 AST: [`./test/fixtures/json/ex1.json`](./test/fixtures/json/ex1.json)

想实现自定义的 JSON，可以参考 `defaultTreeAdapter` 重新实现一个 `TreeAdapter`，但是成本比较高，例如 `parse5-htmlparser2-tree-adapter` 就是一个实现了 `TreeAdapter` 的库，专门将 HTML 转成 `htmlparser2` 的 AST 格式。

因此我们直接将 parse5 的 AST 转成自己想要的格式，利用深度优先搜索的方式遍历 AST，然后将每个节点转成自定义的 JSON 格式就可以了。

## 简洁实现

简单实现一个转换逻辑：

```ts
export function ast2CustomizedJson(ast: any): any {
  if (ast.nodeName === '#document' || ast.nodeName === '#document-fragment') {
    return {
      type: 'doc',
      content: ast.childNodes.map(ast2CustomizedJson).filter(Boolean),
    }
  } else if (ast.nodeName === '#text') {
    return {
      type: 'text',
      text: ast.value,
    }
  } else if (ast.nodeName === '#comment') {
    return null
  } else {
    return {
      type: nodeName2Type[ast.nodeName],
      content: ast.childNodes.map(ast2CustomizedJson),
    }
  }
}

export const html2json = (html: string) => {
  const ast = parseFragment(html)

  return ast2CustomizedJson(ast)
}

```

就可以将原来的 AST 转换成自己想要的 JSON 格式：

```json
{
  "type": "doc",
  "content": [
    {
      "type": "text",
      "text": "\n\n\n\n\n    "
    },
    {
      "type": "heading",
      "content": [
        {
          "type": "text",
          "text": "My First Heading"
        }
      ]
    },
    {
      "type": "text",
      "text": "\n    "
    },
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "My first paragraph."
        }
      ]
    },
    {
      "type": "text",
      "text": "\n\n\n\n"
    }
  ]
}
```

## 复杂逻辑

这里举几个特殊处理的情况作为例子，扩展转换逻辑。

```html
<div class="ct-note" data-type="info" data-hidden-title style="text-align: center">
  <div class="ct-note-title"><span class="ct-note-title-text"></span></div>
  <div class="ct-note-content">内容</div>
</div>

```

```json
{
  "type": "doc",
  "content": [
    {
      "type": "note",
      "content": [
        {
          "type": "text",
          "text": "\n  "
        },
        {
          "type": "note_title",
          "content": [
            {
              "type": "note_title_text",
              "content": [],
              "attrs": {}
            }
          ],
          "attrs": {}
        },
        {
          "type": "text",
          "text": "\n  "
        },
        {
          "type": "note_content",
          "content": [
            {
              "type": "text",
              "text": "内容"
            }
          ],
          "attrs": {}
        },
        {
          "type": "text",
          "text": "\n"
        }
      ],
      "attrs": {
        "type": "info",
        "hiddenTitle": true,
        "textAlign": " center"
      }
    },
    {
      "type": "text",
      "text": "\n"
    }
  ]
}
```

在这个例子中，增加了几个逻辑：

1. 将 `data-*` 属性解析成 `attrs` 字段，并且将中划线命名格式变成了驼峰格式。
2. 将 `class` 为 `ct-*` 格式的类名作为节点的 `type` 字段。
3. 将 `style` 属性解析成 `attrs` 字段，并且将样式名变成了驼峰格式。

```ts
export function ast2CustomizedJson(ast: any): any {
  if (ast.nodeName === '#document' || ast.nodeName === '#document-fragment') {
    // ...
  } else if (...) {
  // ...
  } else {
    let attrs: Record<string, string | boolean> = {}
    let type = null
    ast.attrs.forEach((attr: Attribute) => {
      if (attr.name.startsWith('data-')) {
        attrs[camelCase(attr.name.slice(5))] = attr.value || true
      } else {
        // 类名
        if (attr.name === 'class') {
          const classes = attr.value.split(' ')
          classes.forEach((className: string) => {
            if (className.startsWith('ct-')) {
              type = snakeCase(className.slice(3))
            }
          })
        }
        // 样式
        else if (attr.name === 'style') {
          const styles = attr.value.split(';')
          styles.forEach((style: string) => {
            const [key, value] = style.split(':')
            attrs[camelCase(key)] = value
          })
        }
      }

      return {
        type: type || nodeName2Type[ast.nodeName],
        content: ast.childNodes.map(ast2CustomizedJson),
        attrs
      }
    })
  }
}
```
