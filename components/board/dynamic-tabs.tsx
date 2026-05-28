"use client";

import dynamic from "next/dynamic";
import { BoardTabLoadingShell } from "./BoardTabLoadingShell";
import {
  loadCalendarBoard,
  loadCoffeeCheckin,
  loadReportCenter,
  loadSharedBoard,
  loadSupplyStation,
} from "./tab-component-loaders";

export const DynamicSharedBoard = dynamic(loadSharedBoard, {
  loading: () => <BoardTabLoadingShell label="共享看板加载中" />,
});

export const DynamicCoffeeCheckin = dynamic(loadCoffeeCheckin, {
  loading: () => <BoardTabLoadingShell label="续命咖啡加载中" />,
});

export const DynamicCalendarBoard = dynamic(loadCalendarBoard, {
  loading: () => <BoardTabLoadingShell label="牛马日历加载中" />,
});

export const DynamicReportCenter = dynamic(loadReportCenter, {
  loading: () => <BoardTabLoadingShell label="战报中心加载中" />,
});

export const DynamicSupplyStation = dynamic(loadSupplyStation, {
  loading: () => <BoardTabLoadingShell label="牛马补给站加载中" />,
});
