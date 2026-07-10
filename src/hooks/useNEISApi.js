import { useState, useEffect } from 'react'
import { mockMeals } from '../data/mockMeals.js'
import { fmtDateYMD } from '../utils/formatters.js'

const NEIS_BASE = 'https://open.neis.go.kr/hub'
const API_KEY   = import.meta.env.VITE_NEIS_API_KEY || '3f24c3dc382741bbbc163fc82473623c'

export async function fetchMealData(regionCode, schoolCode, date) {
  const url = `${NEIS_BASE}/mealServiceDietInfo?` + new URLSearchParams({
    KEY: API_KEY,
    Type: 'json',
    ATPT_OFCDC_SC_CODE: regionCode,
    SD_SCHUL_CODE: schoolCode,
    MLSV_YMD: date,
  })
  try {
    const res  = await fetch(url)
    const data = await res.json()
    return data.mealServiceDietInfo?.[1]?.row || null
  } catch {
    return null
  }
}

export async function fetchSchoolInfo(schoolName) {
  const url = `${NEIS_BASE}/schoolInfo?` + new URLSearchParams({
    KEY: API_KEY,
    Type: 'json',
    SCHUL_NM: schoolName,
  })
  try {
    const res  = await fetch(url)
    const data = await res.json()
    return data.schoolInfo?.[1]?.row || []
  } catch {
    return []
  }
}

export function useTodayMeal(regionCode, schoolCode) {
  const [data, setData]       = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError]     = useState(null)
  const [isLive, setIsLive]   = useState(false)

  useEffect(() => {
    if (!regionCode || !schoolCode) {
      // fallback to most recent mock meal
      const sorted = [...mockMeals].sort((a, b) => b.date.localeCompare(a.date))
      setData(sorted[0] || null)
      setLoading(false)
      return
    }

    const today = fmtDateYMD(new Date())
    setLoading(true)

    fetchMealData(regionCode, schoolCode, today)
      .then(rows => {
        if (rows && rows.length > 0) {
          setData(rows[0])
          setIsLive(true)
        } else {
          const sorted = [...mockMeals].sort((a, b) => b.date.localeCompare(a.date))
          setData(sorted[0] || null)
          setIsLive(false)
        }
      })
      .catch(err => {
        setError(err)
        const sorted = [...mockMeals].sort((a, b) => b.date.localeCompare(a.date))
        setData(sorted[0] || null)
      })
      .finally(() => setLoading(false))
  }, [regionCode, schoolCode])

  return { data, loading, error, isLive }
}

export function useSchoolSearch(query) {
  const [results, setResults] = useState([])
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!query || query.length < 2) { setResults([]); return }
    const timer = setTimeout(async () => {
      setLoading(true)
      try {
        const rows = await fetchSchoolInfo(query)
        setResults(rows.slice(0, 10))
      } catch {
        setResults([])
      } finally {
        setLoading(false)
      }
    }, 300)
    return () => clearTimeout(timer)
  }, [query])

  return { results, loading }
}
