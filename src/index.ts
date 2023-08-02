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
  'span': 'span',
  'b': 'strong',
  'i': 'em',
  'u': 'underline',
  's': 'strike',
  'sub': 'subscript',
  'sup': 'superscript',
  'font': 'text',
  'center': 'paragraph'
} as Record<string, string>

export function toString(node:any): string {
  if (!node) return ''
  if (node.type === 'text') return node.text
  if (!node.content) {
    return ''
  }
  return node.content.map(toString).join('')
}

export const convertStringToAppropriateType = (value: string) => {
  if (value === 'true') return true
  if (value === 'false') return false
  if (value === 'null') return null
  if (value === 'undefined') return undefined
  if (value === '') return undefined
  if (value === 'NaN') return NaN
  if (value === 'Infinity') return Infinity
  if (value === '-Infinity') return -Infinity
  // if is number
  if (!Number.isNaN(Number(value))) return Number(value)
  return value
}


export function ast2CustomizedJson(ast: any): any {
  if (ast.nodeName === '#document' || ast.nodeName === '#document-fragment') {
    return {
      type: 'doc',
      content: ast.childNodes.map(ast2CustomizedJson).filter(Boolean),
    }
  } else if (ast.nodeName === '#text') {
    if (ast.value.trim() === '') return null

    return {
      type: 'text',
      text: ast.value,
    }
  } else if (ast.nodeName === '#comment') {
    return null
  } else {

    let attrs: Record<string, string | boolean | number | number[]> = {}
    let type = null
    let marks: any[] = []
    ast.attrs.forEach((attr: Attribute) => {
      if (attr.name.startsWith('data-')) {
        switch (attr.name) {
          case 'data-borderwidth':
            attrs.borderWidth = Number(attr.value)
            break
          case 'data-colwidth':
            attrs.colwidth = attr.value.split(',').map((v: string) => Number(v))
            break
          default:
            let tmp = convertStringToAppropriateType(attr.value)
            attrs[camelCase(attr.name.slice(5))] = (typeof tmp === 'string' ? (tmp.trim() ? tmp : true) : tmp) ?? true
        }

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
            switch (key) {
              case 'color':
                marks.push({
                  type: 'color',
                  attrs: {
                    color: value,
                  },
                })
                break
              default:
                attrs[camelCase(key)] = value
            }
          })
        } else if (attr.name === 'colspan') {
          attrs.colspan = Number(attr.value)
        } else if (attr.name === 'rowspan') {
          attrs.rowspan = Number(attr.value)
        } else if (attr.name === 'href' || attr.name === 'title' || attr.name === 'id') {
          attrs[attr.name] = attr.value
        }
      }
    })

    // 如果是 heading，需要根据 level 设置 attrs
    if (ast.nodeName.startsWith('h') && Number.isInteger(Number(ast.nodeName.slice(1)))) {
      attrs.level = Number(ast.nodeName.slice(1))
    }

    let ans: any = {
      type: type || nodeName2Type[ast.nodeName],
      attrs,
      content: ast.childNodes.map(ast2CustomizedJson).filter(Boolean),
    }
    if (marks.length) ans.marks = marks

    if (ans.type === 'span') {
      ans.text = toString(ans)
      ans.type = 'text'
      delete ans.content
      if (!ans.text) return null
    }

    let new_content: any[] = []
    if (ans?.content?.length) {
      for (let i = 0; i < ans.content.length; i++) {
        if (ans.content[i].type === 'table_body') {
          new_content.push(...ans.content[i].content)
        } else {
          new_content.push(ans.content[i])
        }
      }
      ans.content = new_content
    } else {
      delete ans.content
    }

    if ((ans.type === 'table_cell' || ans.type === 'table_header' || ans.type === 'collapse_content' || ans.type === 'list_item')) {
      if (!ans.content) {
        ans.content = [
          {
            "type": "paragraph",
            "attrs": {},
            "content": []
          }
        ]
      } else {
        for (let i = 0; i < ans.content.length; i++) {
          const child = ans.content[i]
          // 按照规范必须包一层 paragraph（collapse/table 除外），没包的话我们主动生成下
          if (child.type !== 'paragraph' && child.type !== 'collapse' && child.type !== 'table') {
            ans.content[i] = {
              "type": "paragraph",
              "attrs": {},
              "content": [child]
            }
          }
        }
      }

    } else if (ans.type === 'link') {
      ans.attrs ??= []
      ans.attrs.title = ans.attrs.title || ans.content?.[0]?.text
    }


    if ((ans.type === 'table_cell' || ans.type === 'table_header')) {
      ans.attrs ??= {}
      ans.attrs.colspan ??= 1
      ans.attrs.rowspan ??= 1
      ans.attrs.colwidth ??= [0]
    } else if (ans.type === 'strong') {
      ans = ans.content[0]
      ans.marks = [{ type: 'strong' }]
    }

    return ans
  }
}

export const html2json = (html: string) => {
  const ast = parseFragment(html)

  return ast2CustomizedJson(ast)
}
