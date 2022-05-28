import React, { ComponentType, createElement, ReactElement, useEffect, useState } from 'react';
import { createBrowserHistory } from 'history';
import qs from 'qs';
import { Switch, Route as DOMRoute, Router } from 'react-router-dom';

export type ReactNavigationParamType = 'string' | 'number' | 'boolean' | 'storage';

export interface ReactNavigationItemProps<Q> {
  path: string | string[];
  component: () => Promise<{ default: ComponentType<any> }>;
  layout?: ComponentType<any> | false;
  title: string;
  /** 用于指定部分不在菜单上的路由指定当前菜单 */
  activeMenusPath?: string;
  /** 面包屑 urls，默认最后一级是自身，第一级是首页 */
  breadCrumb?: string[];
  queryFormat?: {[K in keyof Q]?: ReactNavigationParamType};
  $query?: Q;
}

export interface ReactNavigationOption {
  defaultLayout?: ComponentType<any>;
  asyncLoadingComponent?: React.ReactElement;
  asyncLoadErrorComponent?: React.ReactElement;
}

export interface ReactNavigationData {
  [key: string]: ReactNavigationItemProps<unknown>;
}

const DEFAULT_LAYOUT_MAP_KEY = 'default';

export default class ReactNavigation<O extends ReactNavigationData> {
  public history = createBrowserHistory();

  /** 数据 */
  private array: ReactNavigationItemProps<unknown>[];

  /** 以 url(全小写，带首/) 为 key，方便通过url查找查找 (不包含带有 pathparam 的地址 如 /:id) */
  private maps: ReactNavigationData = {};

  /**
   * 所有 pathparam 的地址，如果 path 中有两个，会被分解未两个
   *
   * 如： { ...options, path: ['/a/:id', '/b/:id'] }
   *
   * 会被拆分未 { ...options, path: '/a/:id' } 和 { ...options, path: '/b/:id' } 两个路由
   */
  private pathParamArray: (Omit<ReactNavigationItemProps<unknown>, 'path'> & { path: string })[] = [];

  private isNullOrUndefined (value: any): value is (null | undefined | void) {
    return value === null || value === void 0;
  }

  private singleOrArrayToArray <T> (value?: T | T[]): T[] {
    return this.isNullOrUndefined(value) ? [] : Array.isArray(value) ? value : [value];
  }

  private getSingleOrArrayFirst <T> (value?: T | T[]): T | undefined {
    return Array.isArray(value) ? value[0] : value;
  }

  private isPathParamRoute (path: string) {
    return /\/:/.test(path);
  }

  private uuid () {
    return (Math.random().toString(16) + Date.now().toString(16)).replace(/[^a-z0-9]/g, '');
  }

  private formatUrl <K extends keyof O> (name: K, query: any = {}) {
    /** 如果 通过 name 查不到则直接取 name 作为 url */
    let url = this.getSingleOrArrayFirst(this.routes[name]?.path) ?? name as string;

    const currentRoute = this.findCurrentRoute(url);

    for (const [key, value] of Object.entries<ReactNavigationParamType>(currentRoute.queryFormat || {})) {
      if (value === 'storage' && !this.isNullOrUndefined(query[key])) {
        const storageKey = this.uuid();
        sessionStorage.setItem(storageKey, JSON.stringify(query[key]));
        query[key] = storageKey;
      }
    }

    /** pathparam 都转换过，path 必定是 string */
    if (typeof currentRoute?.path === 'string' && this.isPathParamRoute(currentRoute.path)) {
      url = currentRoute.path.split('/').map(item => {
        if (item.startsWith(':')) {
          const key = item.slice(1);
          if (!this.isNullOrUndefined(query[key])) {
            const val = query[key];
            delete query[key];
            return val;
          }
        }
        return item;
      }).join('/');
    }

    if (query && Object.keys(query).length) {
      url += (url.includes('?') ? '&' : '?') + qs.stringify(query);
    }
    return url;
  }

  static generator<Q>(params: Omit<ReactNavigationItemProps<Q>, '$query'>): ReactNavigationItemProps<Q> {
    return { ...params, $query: {} as Q };
  }

  /**
   * 异步加载组件，并在加载中以及加载失败返回一个占位组件
   *
   * - `Route` 配置的 `component` 可以直接使用使用
   * @example asyncLoadComponent(() => import('pages/Home'))
   *
   * - 当然也可以添加 `webpackChunkName` 注释增加 `webpack` 分块编译输出的文件名
   * @example asyncLoadComponent(() => import(\/* webpackChunkName: "page-home" *\/ 'pages/Home'))
   */
  private asyncLoadComponent (fn: () => Promise<{ default: ComponentType<any> }>) {
    return (props: any) => {
      const [component, setComponent] = useState<ReactElement>(this.options?.asyncLoadingComponent ?? <div>正在加载页面资源</div>);

      useEffect(() => {
        fn().then(res => setComponent(createElement(res.default, props))).catch(() => setComponent(this.options?.asyncLoadErrorComponent ?? <div>页面资源加载失败</div>));
      }, []);

      return component;
    };
  }

  constructor (public routes: O, private options?: ReactNavigationOption) {
    this.options = options;
    this.routes = routes;
    this.array = Object.values(routes);
    this.array.forEach(route => {
      route.layout ??= this.options?.defaultLayout;
      if (route.layout === false) {
        delete route.layout;
      }
      this.singleOrArrayToArray(route.path).forEach(path => {
        this.isPathParamRoute(path) ? this.pathParamArray.push({ ...route, path }) : this.maps[path.toLowerCase()] = route;
      });
    });
  }

  /** 查找当前的路由配置 */
  public findCurrentRoute (url: string = location.pathname): ReactNavigationItemProps<unknown> {
    const pathname = url?.split('?')[0] || '';
    return this.maps[pathname.toLowerCase()] || this.pathParamArray.find(route => new RegExp(`^${route.path.replace(/\/:[^/]+/g, '/([^/]+)')}$`, 'i').test(pathname));
  }

  public getQuery <T> (): Partial<T> {
    const query = qs.parse(location.search.replace(/^\?/, '')) as unknown as T;
    const currentRoute = this.findCurrentRoute();

    /** pathparam 都转换过，path 必定是 string */
    if (typeof currentRoute?.path === 'string' && this.isPathParamRoute(currentRoute.path)) {
      const localPathArr = location.pathname.split('/');
      currentRoute.path.split('/').forEach((item, index) => item.startsWith(':') && (query[item.slice(1)] = localPathArr[index]));
    }

    /** 根据 param 类型 格式化 参数 */
    Object.entries<ReactNavigationParamType>(currentRoute.queryFormat || {}).forEach(([key, value]) => {
      if (value === 'number') {
        const number = Number(query[key]);
        query[key] = isNaN(number) ? void 0 : number;
      } else if (value === 'boolean') {
        query[key] = query[key] === 'true' ? true : false as unknown;
      } else if (value === 'storage') {
        try {
          query[key] = JSON.parse(sessionStorage.getItem(query[key])!);
        } catch {
          query[key] = void 0;
        }
      }
    });

    return query;
  }

  public push <K extends keyof O>(...[key, params]: void extends O[K]['$query'] ? [K] : [K, O[K]['$query'] ]): void {
    const url = this.formatUrl(key, params);
    this.findCurrentRoute(url) ? this.history.push(url) : location.href = url;
  }

  public replace <K extends keyof O>(...[key, params]: void extends O[K]['$query'] ? [K] : [K, O[K]['$query'] ]): void {
    const url = this.formatUrl(key, params);
    this.findCurrentRoute(url) ? this.history.replace(url) : location.href = url;
  }

  public open <K extends keyof O>(...[key, params]: void extends O[K]['$query'] ? [K] : [K, O[K]['$query'] ]): void {
    window.open(this.formatUrl(key, params));
  }

  public link <K extends keyof O>(...[key, params]: void extends O[K]['$query'] ? [K] : [K, O[K]['$query'] ]): void {
    location.href = this.formatUrl(key, params);
  }

  component (): React.ReactElement {
    const mapRoutes = new Map<React.ComponentType<any> | typeof DEFAULT_LAYOUT_MAP_KEY, ReactNavigationItemProps<unknown>[]>();
    this.array.forEach(route => {
      const current = mapRoutes.get(route.layout || DEFAULT_LAYOUT_MAP_KEY) || [];
      current.push(route);
      mapRoutes.set(route.layout || DEFAULT_LAYOUT_MAP_KEY, current);
    });

    return (
      <Router history={this.history}>
        <Switch>
          {[...mapRoutes.keys()].map(layout => {
            const routes = mapRoutes.get(layout) || [];
            const paths = routes.reduce<string[]>((p, c) => [...p, ...this.singleOrArrayToArray(c.path)], []);
            const children = routes.map(child => <DOMRoute key={`${child.path}`} exact path={child.path} component={this.asyncLoadComponent(child.component)} />);
            return layout === DEFAULT_LAYOUT_MAP_KEY ? children : <DOMRoute key={`${paths}`} exact path={paths}>{createElement(layout, { children })}</DOMRoute>;
          })}
        </Switch>
      </Router>
    );
  }
}
