import { useState, useEffect, useMemo } from 'react'
import { mockSchools } from '../data/mockSchools.js'
import { mockMeals }   from '../data/mockMeals.js'
import { API_BASE } from '../utils/apiBase.js'

export function useSchoolData(schoolId) {
  const school = useMemo(
    () => mockSchools.find(s => s.id === schoolId) || null,
    [schoolId]
  )
  const fallbackMeals = useMemo(
    () => mockMeals.filter(m => m.school_id === schoolId).sort((a, b) => a.date.localeCompare(b.date)),
    [schoolId]
  )

  const [realMeals, setRealMeals] = useState(null)
  const [loadingRealMeals, setLoadingRealMeals] = useState(false)
  const [dataSource, setDataSource] = useState('mock') // 'mock' | 'neis'

  useEffect(() => {
    if (!school?.code || !school?.regionCode) return
    setLoadingRealMeals(true)
    fetch(`${API_BASE}/api/neis/meals/${school.regionCode}/${school.code}`)
      .then(r => r.json())
      .then(data => {
        if (data.success && data.meals?.length >= 5) {
          setRealMeals(data.meals)
          setDataSource('neis')
        }
      })
      .catch(() => {})
      .finally(() => setLoadingRealMeals(false))
  }, [school?.code, school?.regionCode])

  const meals = realMeals ?? fallbackMeals
  return { school, meals, loadingRealMeals, dataSource }
}

export function useSchoolList() {
  const [sortBy, setSortBy]       = useState('mar_asc')
  const [filterRegion, setFilter] = useState('all')
  const [filterGrade, setGrade]   = useState('all')

  const filtered = useMemo(() => {
    let list = [...mockSchools]
    if (filterRegion !== 'all') list = list.filter(s => s.region === filterRegion)
    if (filterGrade  === 'miss')  list = list.filter(s => s.scores.mar < 60)
    if (filterGrade  === 'warn')  list = list.filter(s => s.scores.mar >= 60 && s.scores.mar < 70)
    if (filterGrade  === 'ok')    list = list.filter(s => s.scores.mar >= 70)

    switch (sortBy) {
      case 'mar_asc':  list.sort((a, b) => a.scores.mar - b.scores.mar); break
      case 'mar_desc': list.sort((a, b) => b.scores.mar - a.scores.mar); break
      case 'eff_desc': list.sort((a, b) => b.scores.efficiency - a.scores.efficiency); break
      case 'streak':   list.sort((a, b) => b.streaks.iron_deficit_days - a.streaks.iron_deficit_days); break
      default: break
    }
    return list
  }, [sortBy, filterRegion, filterGrade])

  return { schools: filtered, sortBy, setSortBy, filterRegion, setFilter, filterGrade, setGrade }
}

export function useRecentSchools() {
  const key = 'mealradar_recent'
  const get = () => {
    try { return JSON.parse(localStorage.getItem(key) || '[]') } catch { return [] }
  }
  const add = (id) => {
    const list = get().filter(x => x !== id)
    localStorage.setItem(key, JSON.stringify([id, ...list].slice(0, 5)))
  }
  return { getRecent: get, addRecent: add }
}
