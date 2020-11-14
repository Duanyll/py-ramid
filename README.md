# Py-Ramid

Duanyll 鶸的 Screeps 代码，不会任务机制，简单粗暴。

A Screeps AI by Duanyll. Don't ask where the name comes from.

Based on [screepers/screeps-typescript-starter](https://github.com/screepers/screeps-typescript-starter).

## Design 设计

整体设计尽量简单化，重视缓存。

### 资源调度

以 terminal 为中心，将 storage 的作用视作存储 terminal 放不下的资源。

## Note

1. `GameObject` 都不能跨 tick 缓存！方法可以正常调用，但是属性不会刷新
