/**
 * Type definitions for ROI Calculation component sub-components
 */
import React from 'react';

export interface CleanInputProps {
  label: string;
  val: number;
  set: (value: number) => void;
  min: number;
  max: number;
  step: number;
  unit: string;
}

export interface KPICardProps {
  icon?: React.ReactNode;
  title: string;
  value: number;
  prefix?: string;
  suffix?: string;
  isCurrency: boolean;
  color: string;
  bottomLabel: React.ReactNode;
}

export interface VariableDefProps {
  symbol: string;
  desc: string;
}

export interface ProfitLossGraphProps {
  weeks: number;
  manualBurn: number;
  autoBurn: number;
  buildCost: number;
  breakEven: number;
}
