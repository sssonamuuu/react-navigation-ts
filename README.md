# 带有ts签名的路由跳转

路由配置和跳转以及参数全都支持 `ts` 类型签名。自动匹配路由参数。

在使用 push/replace 等方法的时候，自动联想可跳转页面以及该页面参数。

## 使用方式

```ts
// navigation.ts

import ReactNavigation from 'react-navigation-ts';
import Layout from '@/layouts';
import Page1Query from '@/pages/page1';

const navigation = new ReactNavigation({
  home: Route.generator({
    path: '/',
    component: () => import('@/pages/home'),
  }),
  page1: Route.generator<Page1Query>({
    path: '/page1',
    component: () => import('@/pages/page1'),
    queryFormat: { a: 'number' }
  }),
  page2: Route.generator<{ id: number }>({
    path: '/page2',
    component: () => import('@/pages/page2/:id'),
    queryFormat: { id: 'number' }
  }),
  // ...
}, {
  defaultLayout: Layout
});
```

```ts
// app.ts
import ReactDOM from 'react-dom';
import navigation from '..../navigation.ts';

ReactDOM.render(navigation.component(), document.querySelector(`#${config.rootID}`));
```

```tsx
// page1.tsx

import navigation from '..../navigation.ts';

export interface Page1Query {
  a: number;
  b: string;
}

export default function Page1 () {
  const query = navigation.getQuery<Page1Query>();
  return <div onClick={() => navigation.push('page2')}>page1</div>
}
```

## routes.component

生成路由的组件

## Route.generator

生成路由项

| 属性        | 类型                                                       | 是否必填 | 备注                                                                                                                                                               |
| ----------- | ---------------------------------------------------------- | -------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| path        | string \| string[]                                         | ✅        | 支持/:xxx的路径参数                                                                                                                                                |
| component   | () => Promise<{ default: ComponentType<any> }>             | ✅        |                                                                                                                                                                    |
| layout      | ComponentType<any> \| false                                | ❎        | 可以通过new的第二个参数配置默认的 layout，false表示取消默认配置的layout，不使用                                                                                    |
| queryFormat | { [K in keyof Param]: 'number' \| 'boolean' \| 'storage' } | ❎        | 默认url获取的参数都是 string，可以通过指定类型去解析参数，storage表示为数据复杂结构，临时存储 sessionStorage 并生成唯一的key作为参数，获取时通过key读取storage内容 |

