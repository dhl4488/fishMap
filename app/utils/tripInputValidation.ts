export type MeasurementKind = 'length' | 'rodLength' | 'weight' | 'depth' | 'tackleWeight'

const measurementLimits: Record<MeasurementKind, { defaultUnit: string; canonicalUnit: string; max: number; units: Record<string, number> }> = {
  length: {
    defaultUnit: 'cm',
    canonicalUnit: 'cm',
    max: 305,
    units: {
      mm: 0.1, millimeter: 0.1, millimeters: 0.1,
      cm: 1, centimeter: 1, centimeters: 1,
      m: 100, meter: 100, meters: 100,
      in: 2.54, inch: 2.54, inches: 2.54,
      ft: 30.48, foot: 30.48, feet: 30.48
    }
  },
  rodLength: {
    defaultUnit: 'cm',
    canonicalUnit: 'cm',
    max: 915,
    units: {
      mm: 0.1, millimeter: 0.1, millimeters: 0.1,
      cm: 1, centimeter: 1, centimeters: 1,
      m: 100, meter: 100, meters: 100,
      in: 2.54, inch: 2.54, inches: 2.54,
      ft: 30.48, foot: 30.48, feet: 30.48
    }
  },
  weight: {
    defaultUnit: 'kg',
    canonicalUnit: 'kg',
    max: 227,
    units: {
      mg: 0.000001, milligram: 0.000001, milligrams: 0.000001,
      g: 0.001, gram: 0.001, grams: 0.001,
      kg: 1, kilogram: 1, kilograms: 1,
      oz: 0.0283495231, ounce: 0.0283495231, ounces: 0.0283495231,
      lb: 0.45359237, lbs: 0.45359237, pound: 0.45359237, pounds: 0.45359237
    }
  },
  depth: {
    defaultUnit: 'm',
    canonicalUnit: 'm',
    max: 6_100,
    units: {
      mm: 0.001, millimeter: 0.001, millimeters: 0.001,
      cm: 0.01, centimeter: 0.01, centimeters: 0.01,
      m: 1, meter: 1, meters: 1,
      km: 1_000, kilometer: 1_000, kilometers: 1_000,
      in: 0.0254, inch: 0.0254, inches: 0.0254,
      ft: 0.3048, foot: 0.3048, feet: 0.3048
    }
  },
  tackleWeight: {
    defaultUnit: 'g',
    canonicalUnit: 'g',
    max: 45_000,
    units: {
      mg: 0.001, milligram: 0.001, milligrams: 0.001,
      g: 1, gram: 1, grams: 1,
      kg: 1_000, kilogram: 1_000, kilograms: 1_000,
      oz: 28.3495231, ounce: 28.3495231, ounces: 28.3495231,
      lb: 453.59237, lbs: 453.59237, pound: 453.59237, pounds: 453.59237
    }
  }
}

const measurementPart = /(\d+\s*\/\s*\d+|\d+(?:\.\d+)?)\s*(millimeters?|mm|centimeters?|cm|kilometers?|km|meters?|m|inches?|in|feet|foot|ft|pounds?|lbs?|ounces?|oz|kilograms?|kg|milligrams?|mg|grams?|g)?/gi

function parseMeasurementAmounts(value: string, kind: MeasurementKind): number[] | null {
  const trimmed = value.trim()
  if (!trimmed) return []

  const limits = measurementLimits[kind]
  const amounts: number[] = []
  for (const alternative of trimmed.split(/\s+or\s+/i)) {
    const parser = new RegExp(measurementPart.source, 'gi')
    const matches = [...alternative.matchAll(parser)]
    if (!matches.length || alternative.replace(new RegExp(measurementPart.source, 'gi'), '').replace(/[\s,+&.]/g, '')) return null

    let total = 0
    for (const match of matches) {
      const rawNumber = match[1].replace(/\s/g, '')
      const [numerator, denominator] = rawNumber.split('/')
      const amount = denominator ? Number(numerator) / Number(denominator) : Number(rawNumber)
      const unit = (match[2] ?? limits.defaultUnit).toLowerCase()
      const factor = limits.units[unit]
      if (!Number.isFinite(amount) || amount <= 0 || factor === undefined) return null
      total += amount * factor
    }

    amounts.push(total)
  }
  return amounts
}

export function isWithinMeasurementRange(value: string, kind: MeasurementKind): boolean {
  const amounts = parseMeasurementAmounts(value, kind)
  if (amounts === null) return false
  return amounts.every(amount => amount <= measurementLimits[kind].max)
}

export function normalizeMeasurementToMetric(value: string, kind: MeasurementKind): string {
  const amounts = parseMeasurementAmounts(value, kind)
  if (!amounts?.length) return value.trim()
  const amount = Number(amounts[0].toFixed(1))
  return `${amount} ${measurementLimits[kind].canonicalUnit}`
}

export function isWithinNumericRange(value: string | number, min: number, max: number): boolean {
  if (value === '' || (typeof value === 'string' && !value.trim())) return true
  const number = Number(value)
  return Number.isFinite(number) && number >= min && number <= max
}

export function isCurrentOrPastDate(value: string, today: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > today) return false
  const parsed = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value
}
