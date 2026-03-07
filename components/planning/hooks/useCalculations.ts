import { useMemo } from 'react';
import { PlannedService, PlannedMaterial, PlannedLabor, PlannedIndirect, PlanTax } from '../types';

export const useCalculations = (
    services: PlannedService[],
    materials: PlannedMaterial[],
    labor: PlannedLabor[],
    indirects: PlannedIndirect[],
    taxes: PlanTax[]
) => {
    const totalServices = useMemo(
        () => services.reduce((acc, s) => acc + (s.total_cost || 0), 0),
        [services]
    );

    const totalMaterial = useMemo(
        () => materials.reduce((acc, m) => acc + (m.total_cost || 0), 0),
        [materials]
    );

    const totalLabor = useMemo(
        () => labor.reduce((acc, l) => acc + (l.total_cost || 0), 0),
        [labor]
    );

    const totalIndirect = useMemo(
        () => indirects.reduce((acc, i) => acc + (i.value || 0), 0),
        [indirects]
    );

    const totalDirect = useMemo(
        () => totalServices + totalMaterial + totalLabor + totalIndirect,
        [totalServices, totalMaterial, totalLabor, totalIndirect]
    );

    const bdiTax = useMemo(() => taxes.find(t => t.name === 'BDI'), [taxes]);
    const otherTaxes = useMemo(() => taxes.filter(t => t.name !== 'BDI'), [taxes]);

    const bdiValue = useMemo(() => {
        if (!bdiTax) return 0;
        return bdiTax.rate > 0 ? (totalDirect * (bdiTax.rate / 100)) : (bdiTax.value || 0);
    }, [bdiTax, totalDirect]);

    const desiredLiquid = totalDirect + bdiValue;

    const taxFactor = useMemo(() => {
        const sumRates = otherTaxes.reduce(
            (acc, t) => acc + (t.rate > 0 ? t.rate / 100 : 0),
            0
        );
        return Math.max(0.01, 1 - sumRates);
    }, [otherTaxes]);

    const totalGeneral = useMemo(() => {
        const sumFixed = otherTaxes.reduce(
            (acc, t) => acc + (t.rate > 0 ? 0 : (t.value || 0)),
            0
        );
        return (desiredLiquid + sumFixed) / taxFactor;
    }, [desiredLiquid, otherTaxes, taxFactor]);

    const totalTaxes = useMemo(() => totalGeneral - totalDirect, [totalGeneral, totalDirect]);

    return {
        totalServices,
        totalMaterial,
        totalLabor,
        totalIndirect,
        totalDirect,
        bdiValue,
        desiredLiquid,
        taxFactor,
        totalGeneral,
        totalTaxes,
    };
};
