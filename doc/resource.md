# 资源管理机制

## StoreRegister

`StoreRegister` 对象可用于一定区域内的资源储量统计, 通过 `parent` 属性可以按照树形结构组织 `StoreRegister`, 自动同步大范围内的统计量.

## 资源统计

`RoomInfo` 的 `storeCurrent` 属性指示房间内资源的现有储量. `storeBook` 指示当前房间需要的储量. `storeBook - storeCurrent` 即为需要进口的资源储量.

房间的各个 `storeRegister` 的父对象是全局的 `global.store` 各相应属性. 全局生产队列直接操作 `global.store` 对象.

## Lab 合成化合物

为提高效率, 安排同一个房间完成目标化合物的全部子合成任务. 例如, 要合成 `XKH2O`, 则

1. `K + H = KH`
2. `O + H = OH`
3. `KH + OH = KH2O`
4. `X + KH2O = XKH2O`

等步骤都依次在同一个房间完成. 使用房间的生产队列管理这一点.

由于房间的 `storeBook` 也负责即时跨房间调配资源, 所以房间生产队列里的资源贡献应记在全局 `book` 中.
