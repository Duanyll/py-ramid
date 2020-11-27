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

## 算账

比如说挖外矿
用15work的harvester，挖3000energy要100*0.2=20cpu
假设距离100，搬运工跑两趟，要400*0.2=80cpu
100cpu挖到3000energy，0.25Cr的价格卖掉一半，375Cr
1cpu产生了3.75Cr的价值，是直接搓pixel的30倍

挖power
25atk加两个healer，2666tick敲掉一个pb，消耗1600cpu
假设路程150，要4个搬运工，路上花费0.2*(4*2+3*2)*150=420cpu
挖到3000power，大约消耗50k energy，净赚17500Cr
每cpu产生8Cr价值
