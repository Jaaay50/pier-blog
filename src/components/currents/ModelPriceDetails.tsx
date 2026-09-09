'use client';

import type {ModelsPrice} from '@/lib/currents/models-types';
import {ModelPriceTable} from './ModelPriceTable';
import {usePriceClock} from './usePriceClock';

export interface ModelPriceDetailsProps {
  price:ModelsPrice;
  locale:string;
  initialNow:number;
}

/** 只刷新价格有效期与核验年龄，不自行重算能力分、性价比分或历史。 */
export function ModelPriceDetails({price,locale,initialNow}:ModelPriceDetailsProps) {
  const now=usePriceClock(initialNow,price.rates,price.verifiedAt);
  return <ModelPriceTable price={price} locale={locale} now={now}/>;
}
