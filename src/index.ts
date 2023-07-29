import { parseFragment, html } from 'parse5'
import { Attribute } from 'parse5/dist/common/token'
import camelCase from 'camelcase';
import { snakeCase } from "snake-case";

export const nodeName2Type = {
  '#document': 'doc',
  '#document-fragment': 'doc',
  '#text': 'text',
  'p': 'paragraph',
  'h1': 'heading',
  'h2': 'heading',
  'h3': 'heading',
  'h4': 'heading',
  'h5': 'heading',
  'h6': 'heading',
  'ul': 'bullet_list',
  'ol': 'ordered_list',
  'li': 'list_item',
  'blockquote': 'blockquote',
  'pre': 'code_block',
  'a': 'link',
  'img': 'image',
  'br': 'hard_break',
  'em': 'em',
  'strong': 'strong',
  'code': 'code',
  'del': 'strike',
  'hr': 'horizontal_rule',
  'table': 'table',
  'tbody': 'table_body',
  'tr': 'table_row',
  'th': 'table_header',
  'td': 'table_cell',
  'div': 'paragraph',
  'span': 'text',
  'b': 'strong',
  'i': 'em',
  'u': 'underline',
  's': 'strike',
  'sub': 'subscript',
  'sup': 'superscript',
  'font': 'text',
  'center': 'paragraph'
} as Record<string, string>

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
    })

    return {
      type: type || nodeName2Type[ast.nodeName],
      content: ast.childNodes.map(ast2CustomizedJson),
      attrs
    }
  }
}

export const html2json = (html: string) => {
  const ast = parseFragment(html)

  return ast2CustomizedJson(ast)
}
