/** @license react-navigation-ts v1.0.3
 * react-navigation-ts.js
 * 
 * Copyright (c) 
 * 
 * This source code is licensed under the MIT license found in the
 * LICENSE file in the root directory of this source tree.
 */
'use strict';

var React = require('react');
var history = require('history');
var qs = require('qs');
var reactRouterDom = require('react-router-dom');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var React__default = /*#__PURE__*/_interopDefaultLegacy(React);
var qs__default = /*#__PURE__*/_interopDefaultLegacy(qs);

const DEFAULT_LAYOUT_MAP_KEY = 'default';
class ReactNavigation {
    routes;
    options;
    history = history.createBrowserHistory();
    /** 数据 */
    array;
    /** 以 url(全小写，带首/) 为 key，方便通过url查找查找 (不包含带有 pathparam 的地址 如 /:id) */
    maps = {};
    /**
     * 所有 pathparam 的地址，如果 path 中有两个，会被分解未两个
     *
     * 如： { ...options, path: ['/a/:id', '/b/:id'] }
     *
     * 会被拆分未 { ...options, path: '/a/:id' } 和 { ...options, path: '/b/:id' } 两个路由
     */
    pathParamArray = [];
    isNullOrUndefined(value) {
        return value === null || value === void 0;
    }
    singleOrArrayToArray(value) {
        return this.isNullOrUndefined(value) ? [] : Array.isArray(value) ? value : [value];
    }
    getSingleOrArrayFirst(value) {
        return Array.isArray(value) ? value[0] : value;
    }
    isPathParamRoute(path) {
        return /\/:/.test(path);
    }
    uuid() {
        return (Math.random().toString(16) + Date.now().toString(16)).replace(/[^a-z0-9]/g, '');
    }
    formatUrl(name, query = {}) {
        /** 如果 通过 name 查不到则直接取 name 作为 url */
        let url = this.getSingleOrArrayFirst(this.routes[name]?.path) ?? name;
        const currentRoute = this.findCurrentRoute(url);
        for (const [key, value] of Object.entries(currentRoute.queryFormat || {})) {
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
            url += (url.includes('?') ? '&' : '?') + qs__default['default'].stringify(query);
        }
        return url;
    }
    static generator(params) {
        return { ...params, $query: {} };
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
    asyncLoadComponent(fn) {
        return (props) => {
            const [component, setComponent] = React.useState(this.options?.asyncLoadingComponent ?? React__default['default'].createElement("div", null, "\u6B63\u5728\u52A0\u8F7D\u9875\u9762\u8D44\u6E90"));
            React.useEffect(() => {
                fn().then(res => setComponent(React.createElement(res.default, props))).catch(() => setComponent(this.options?.asyncLoadErrorComponent ?? React__default['default'].createElement("div", null, "\u9875\u9762\u8D44\u6E90\u52A0\u8F7D\u5931\u8D25")));
            }, []);
            return component;
        };
    }
    constructor(routes, options) {
        this.routes = routes;
        this.options = options;
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
    findCurrentRoute(url = location.pathname) {
        const pathname = url?.split('?')[0] || '';
        return this.maps[pathname.toLowerCase()] || this.pathParamArray.find(route => new RegExp(`^${route.path.replace(/\/:[^/]+/g, '/([^/]+)')}$`, 'i').test(pathname));
    }
    getQuery() {
        const query = qs__default['default'].parse(location.search.replace(/^\?/, ''));
        const currentRoute = this.findCurrentRoute();
        /** pathparam 都转换过，path 必定是 string */
        if (typeof currentRoute?.path === 'string' && this.isPathParamRoute(currentRoute.path)) {
            const localPathArr = location.pathname.split('/');
            currentRoute.path.split('/').forEach((item, index) => item.startsWith(':') && (query[item.slice(1)] = localPathArr[index]));
        }
        /** 根据 param 类型 格式化 参数 */
        Object.entries(currentRoute.queryFormat || {}).forEach(([key, value]) => {
            if (value === 'number') {
                const number = Number(query[key]);
                query[key] = isNaN(number) ? void 0 : number;
            }
            else if (value === 'boolean') {
                query[key] = query[key] === 'true' ? true : false;
            }
            else if (value === 'storage') {
                try {
                    query[key] = JSON.parse(sessionStorage.getItem(query[key]));
                }
                catch {
                    query[key] = void 0;
                }
            }
        });
        return query;
    }
    push(...[key, params]) {
        const url = this.formatUrl(key, params);
        this.findCurrentRoute(url) ? this.history.push(url) : location.href = url;
    }
    replace(...[key, params]) {
        const url = this.formatUrl(key, params);
        this.findCurrentRoute(url) ? this.history.replace(url) : location.href = url;
    }
    open(...[key, params]) {
        window.open(this.formatUrl(key, params));
    }
    link(...[key, params]) {
        location.href = this.formatUrl(key, params);
    }
    component() {
        const mapRoutes = new Map();
        this.array.forEach(route => {
            const current = mapRoutes.get(route.layout || DEFAULT_LAYOUT_MAP_KEY) || [];
            current.push(route);
            mapRoutes.set(route.layout || DEFAULT_LAYOUT_MAP_KEY, current);
        });
        return (React__default['default'].createElement(reactRouterDom.Router, { history: this.history },
            React__default['default'].createElement(reactRouterDom.Switch, null, [...mapRoutes.keys()].map(layout => {
                const routes = mapRoutes.get(layout) || [];
                const paths = routes.reduce((p, c) => [...p, ...this.singleOrArrayToArray(c.path)], []);
                const children = routes.map(child => React__default['default'].createElement(reactRouterDom.Route, { key: `${child.path}`, exact: true, path: child.path, component: this.asyncLoadComponent(child.component) }));
                return layout === DEFAULT_LAYOUT_MAP_KEY ? children : React__default['default'].createElement(reactRouterDom.Route, { key: `${paths}`, exact: true, path: paths }, React.createElement(layout, { children }));
            }))));
    }
}

module.exports = ReactNavigation;
