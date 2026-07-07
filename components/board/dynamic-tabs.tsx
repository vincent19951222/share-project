"use client";

import dynamic from "next/dynamic";
import { BoardTabLoadingShell } from "./BoardTabLoadingShell";
import {
  loadDataDashboard,
  loadDashboardBoard,
  loadDrinkCheckin,
  loadSharedBoard,
  loadSupplyStation,
} from "./tab-component-loaders";

export const DynamicSharedBoard = dynamic(loadSharedBoard, {
  loading: () => <BoardTabLoadingShell label="共享看板加载中" />,
});

export const DynamicDrinkCheckin = dynamic(loadDrinkCheckin, {
  loading: () => <BoardTabLoadingShell label="牛马水铺加载中" />,
});

export const DynamicDashboardBoard = dynamic(loadDashboardBoard, {
  loading: () => <BoardTabLoadingShell label="个人看板加载中" />,
});

export const DynamicDataDashboard = dynamic(loadDataDashboard, {
  loading: () => <BoardTabLoadingShell label="数据看板加载中" />,
});

export const DynamicSupplyStation = dynamic(loadSupplyStation, {
  loading: () => <BoardTabLoadingShell label="牛马补给站加载中" />,
});
