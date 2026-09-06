'use client';

import React, { useEffect, useState } from 'react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MultiSelect } from '@/components/ui/multi-select';
import { DEPARTMENTS } from '@/lib/constants';
import {
  Users,
  UserCheck,
  UserX,
  Building2,
  TrendingUp,
  Award,
  GraduationCap,
  PieChart,
  Filter,
  RotateCcw,
  BarChart3,
} from 'lucide-react';

interface StatsData {
  summary: {
    totalStudents: number;
    placedCount: number;
    unplacedCount: number;
    placementPercentage: string;
    avgPackage: string;
    medianPackage: string;
    maxPackage: string;
  };
  statusDistribution: { status: string; count: number }[];
  branchDistribution: { branch: string; count: number }[];
  topRecruiters: { company: string; count: number; avgPackage: string; maxPackage: string }[];
  availableYears: string[];
  availableDepts: string[];
  availableSections?: string[];
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState<StatsData | null>(null);
  const [loading, setLoading] = useState(true);

  // Multi-Select Filters State
  const [selectedDepts, setSelectedDepts] = useState<string[]>([]);
  const [selectedYears, setSelectedYears] = useState<string[]>([]);
  const [selectedSections, setSelectedSections] = useState<string[]>([]);
  const [availableYears, setAvailableYears] = useState<string[]>([]);
  const [availableSections, setAvailableSections] = useState<string[]>([]);

  const loadStats = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (selectedDepts.length > 0) {
        params.set('dept', selectedDepts.join(','));
      }
      if (selectedYears.length > 0) {
        params.set('year', selectedYears.join(','));
      }
      if (selectedSections.length > 0) {
        params.set('sec', selectedSections.join(','));
      }

      const res = await fetch(`/api/stats/dashboard?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setStats(data);
        if (data.availableYears && data.availableYears.length > 0) {
          setAvailableYears(data.availableYears);
        }
        if (data.availableSections && data.availableSections.length > 0) {
          setAvailableSections(data.availableSections);
        }
      }
    } catch (e) {
      console.error('Failed to load dashboard stats:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadStats();
  }, [selectedDepts, selectedYears, selectedSections]);

  const handleResetFilters = () => {
    setSelectedDepts([]);
    setSelectedYears([]);
    setSelectedSections([]);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-900 tracking-tight">Placement Analytics & Insights</h1>
          <p className="text-sm text-slate-500 mt-1">Real-time placement rates, recruiter stats, and department metrics</p>
        </div>

        {/* Filter Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3">
          {(selectedDepts.length > 0 || selectedYears.length > 0 || selectedSections.length > 0) && (
            <Button
              variant="outline"
              size="sm"
              onClick={handleResetFilters}
              className="border-slate-300 text-slate-700 hover:text-slate-900 gap-1.5 h-9"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reset Filters
            </Button>
          )}
        </div>
      </div>

      {/* MULTI-SELECT FILTERS CARD WITH HIGH Z-INDEX & OVERFLOW VISIBLE */}
      <Card className="glass-card relative z-30 overflow-visible bg-white border-slate-200">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-2">
              <Filter className="h-4 w-4 text-[#1e3a8a]" />
              Filter Analytics by Year, Department & Section
            </span>
            <span className="text-[11px] text-slate-500">
              Select specific years, departments, and sections to update calculations in real-time
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* Academic Year Multi-Select */}
            <MultiSelect
              title="Academic Year"
              options={availableYears}
              selected={selectedYears}
              onChange={setSelectedYears}
            />

            {/* Department Multi-Select */}
            <MultiSelect
              title="Department / Branch"
              options={DEPARTMENTS as unknown as string[]}
              selected={selectedDepts}
              onChange={setSelectedDepts}
            />

            {/* Section Multi-Select */}
            <MultiSelect
              title="Section"
              options={availableSections}
              selected={selectedSections}
              onChange={setSelectedSections}
            />
          </div>

          {/* Active Filter Badges Display */}
          {(selectedDepts.length > 0 || selectedYears.length > 0 || selectedSections.length > 0) && (
            <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-slate-100 text-xs">
              <span className="text-slate-500 font-medium">Active Filters:</span>
              {selectedYears.map((yr) => (
                <span
                  key={yr}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#1e3a8a] border border-blue-200 text-[11px] font-bold"
                >
                  Year: {yr}
                  <button
                    type="button"
                    onClick={() => setSelectedYears(selectedYears.filter((y) => y !== yr))}
                    className="hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedDepts.map((d) => (
                <span
                  key={d}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-amber-50 text-amber-900 border border-amber-200 text-[11px] font-bold"
                >
                  Dept: {d}
                  <button
                    type="button"
                    onClick={() => setSelectedDepts(selectedDepts.filter((dept) => dept !== d))}
                    className="hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
              {selectedSections.map((sec) => (
                <span
                  key={sec}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-purple-50 text-purple-900 border border-purple-200 text-[11px] font-bold"
                >
                  Section: {sec}
                  <button
                    type="button"
                    onClick={() => setSelectedSections(selectedSections.filter((s) => s !== sec))}
                    className="hover:text-red-600 font-bold"
                  >
                    ×
                  </button>
                </span>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {loading ? (
        <div className="flex items-center justify-center min-h-[300px]">
          <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#1e3a8a]"></div>
        </div>
      ) : !stats ? (
        <div className="text-red-600 p-4 font-semibold">Failed to load placement statistics.</div>
      ) : (
        <>
          {/* Metric Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 relative z-10">
            <Card className="glass-card bg-white border-blue-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Total Students</p>
                  <h3 className="text-xl font-extrabold text-slate-900 mt-1">{stats.summary.totalStudents}</h3>
                  <p className="text-[10px] text-[#1e3a8a] mt-1 font-bold">Matching Selection</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-blue-50 text-[#1e3a8a] flex items-center justify-center border border-blue-200 shrink-0">
                  <Users className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white border-emerald-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Placed</p>
                  <h3 className="text-xl font-extrabold text-emerald-700 mt-1">{stats.summary.placedCount}</h3>
                  <p className="text-[10px] text-emerald-700 mt-1 font-extrabold">
                    {stats.summary.placementPercentage}% Placed
                  </p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-200 shrink-0">
                  <UserCheck className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white border-slate-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Unplaced</p>
                  <h3 className="text-xl font-extrabold text-slate-700 mt-1">{stats.summary.unplacedCount}</h3>
                  <p className="text-[10px] text-slate-500 mt-1 font-semibold">Seeking Offers</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200 shrink-0">
                  <UserX className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white border-amber-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Avg Package</p>
                  <h3 className="text-xl font-extrabold text-amber-700 mt-1">₹{stats.summary.avgPackage}</h3>
                  <p className="text-[10px] text-amber-700 mt-1 font-bold">LPA (Mean)</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center border border-amber-200 shrink-0">
                  <TrendingUp className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white border-indigo-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Median Package</p>
                  <h3 className="text-xl font-extrabold text-indigo-700 mt-1">₹{stats.summary.medianPackage || '0.00'}</h3>
                  <p className="text-[10px] text-indigo-700 mt-1 font-bold">LPA (Median)</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center border border-indigo-200 shrink-0">
                  <BarChart3 className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>

            <Card className="glass-card bg-white border-purple-200 shadow-sm">
              <CardContent className="p-4 flex items-center justify-between">
                <div>
                  <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">Highest Package</p>
                  <h3 className="text-xl font-extrabold text-purple-700 mt-1">₹{stats.summary.maxPackage}</h3>
                  <p className="text-[10px] text-purple-700 mt-1 font-bold">LPA (Max)</p>
                </div>
                <div className="h-9 w-9 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center border border-purple-200 shrink-0">
                  <Award className="h-4 w-4" />
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 relative z-10">
            {/* Status Breakdown */}
            <Card className="glass-card bg-white border-slate-200 lg:col-span-1">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <PieChart className="h-5 w-5 text-[#1e3a8a]" />
                  Status Breakdown
                </CardTitle>
                <CardDescription className="text-slate-500">Placed vs Unplaced distribution</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {stats.statusDistribution.map((item) => (
                  <div
                    key={item.status}
                    className="flex items-center justify-between p-3.5 rounded-xl bg-slate-50 border border-slate-200"
                  >
                    <div className="flex items-center gap-2">
                      <Badge variant={item.status === 'PLACED' ? 'placed' : 'unplaced'}>
                        {item.status}
                      </Badge>
                    </div>
                    <span className="font-extrabold text-slate-900 text-sm">{item.count}</span>
                  </div>
                ))}
              </CardContent>
            </Card>

            {/* Top Recruiting Companies */}
            <Card className="glass-card bg-white border-slate-200 lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                  <Building2 className="h-5 w-5 text-[#1e3a8a]" />
                  Top Recruiters
                </CardTitle>
                <CardDescription className="text-slate-500">Companies with highest student selections</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {stats.topRecruiters.length === 0 ? (
                    <p className="text-sm text-slate-500">No recruiters recorded for selected criteria.</p>
                  ) : (
                    stats.topRecruiters.map((recruiter) => (
                      <div
                        key={recruiter.company}
                        className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 hover:border-slate-300 transition-all"
                      >
                        <div className="flex items-center gap-3">
                          <div className="h-10 w-10 rounded-xl bg-[#1e3a8a] text-white flex items-center justify-center font-extrabold">
                            {recruiter.company.charAt(0)}
                          </div>
                          <div>
                            <h4 className="font-extrabold text-slate-900 text-sm">{recruiter.company}</h4>
                            <p className="text-xs text-slate-500">{recruiter.count} Selections</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-extrabold text-emerald-700">Max ₹{recruiter.maxPackage} LPA</p>
                          <p className="text-xs text-slate-500">Avg ₹{recruiter.avgPackage} LPA</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Branch-wise Distribution */}
          <Card className="glass-card bg-white border-slate-200 relative z-10">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2 text-slate-900 font-bold">
                <GraduationCap className="h-5 w-5 text-[#1e3a8a]" />
                Branch-wise Distribution
              </CardTitle>
              <CardDescription className="text-slate-500">Student count across engineering disciplines</CardDescription>
            </CardHeader>
            <CardContent>
              {stats.branchDistribution.length === 0 ? (
                <p className="text-sm text-slate-500">No branch distribution available for selection.</p>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                  {stats.branchDistribution.map((b) => (
                    <div
                      key={b.branch}
                      className="p-4 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between"
                    >
                      <div>
                        <h4 className="text-xs font-bold text-slate-700 line-clamp-1">{b.branch}</h4>
                        <p className="text-lg font-extrabold text-slate-900 mt-1">{b.count} Students</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}
