"use client";

import { useAccountBalance } from "@suiet/wallet-kit";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import Link from "next/link";
import { useState, useEffect } from "react";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts";

// Timeframes for the chart
const timeframes = ["1D", "1W", "1M", "3M", "1Y"];

// API configuration
const API_CONFIG = {
  BASE_URL: "https://everion-fastapi.fly.dev",
  ENDPOINTS: {
    INSIGHTS: "/insights",
  },
  HEADERS: {
    Accept: "application/json",
    "Content-Type": "application/json",
  },
};

interface Insight {
  contract: string;
  sender: string;
  name: string;
  symbol: string;
  price: string;
  price_change_24h: string;
  total_supply: string;
  holders: string;
  market_cap: string;
  top_10_holders_percentage: string;
  verified: boolean;
  scam_flag: string;
  timestamp: string;
  source: string;
}

export function MainContent() {
  const { error, loading, balance } = useAccountBalance();
  const [insights, setInsights] = useState<Insight[]>([]);
  const [chartData, setChartData] = useState<{ time: string; count: number }[]>([]);
  const [selectedTimeframe, setSelectedTimeframe] = useState("1D");
  const [chartLoading, setChartLoading] = useState(false);
  const [chartError, setChartError] = useState<any>(null);

  const formatBalance = (balance: string) => {
    const balanceNumber = Number(balance) / 1e9; // Convert from MIST to SUI
    return new Intl.NumberFormat("en-US", { style: "currency", currency: "SUI" }).format(balanceNumber);
  };

  // Function to determine the top caller (MVP) from insights
  const getTopCaller = (insights: Insight[]): string => {
    const counts: { [key: string]: number } = {};
    insights.forEach((insight) => {
      const sender = insight.sender;
      counts[sender] = (counts[sender] || 0) + 1;
    });
    let topSender = "";
    let maxCount = 0;
    for (const sender in counts) {
      if (counts[sender] > maxCount) {
        maxCount = counts[sender];
        topSender = sender;
      }
    }
    return topSender;
  };

  // Compute the MVP based on insights data
  const topCaller = insights.length > 0 ? getTopCaller(insights) : "";

  const metrics = [
    {
      label: "Total Balance",
      value: loading ? <Skeleton className="h-8 w-24" /> : formatBalance(balance),
    },
    {
      label: "MVP",
      value: topCaller ? topCaller : <Skeleton className="h-8 w-24" />,
    },
    {
      label: "Total Insights",
      value: insights.length.toString(),
    },
  ];

  // Fetch insights from API
  const fetchInsights = async () => {
    setChartLoading(true);
    try {
      const response = await fetch(`${API_CONFIG.BASE_URL}${API_CONFIG.ENDPOINTS.INSIGHTS}`, {
        method: "GET",
        headers: API_CONFIG.HEADERS,
      });
      const data = await response.json();
      if (Array.isArray(data)) {
        setInsights(data);
      } else {
        setInsights([]);
      }
    } catch (error) {
      console.error("Error fetching insights:", error);
      setChartError(error);
    } finally {
      setChartLoading(false);
    }
  };

  useEffect(() => {
    fetchInsights();
    const intervalId = setInterval(fetchInsights, 30000); // Refresh every 30 seconds
    return () => clearInterval(intervalId);
  }, []);

  // Group insights according to the selected timeframe
  const groupInsights = (insights: Insight[], timeframe: string) => {
    const groups: Record<string, number> = {};
    if (timeframe === "1D") {
      insights.forEach((insight) => {
        const date = new Date(insight.timestamp);
        const hour = date.getHours();
        groups[hour] = (groups[hour] || 0) + 1;
      });
      return Object.keys(groups)
        .map((key) => ({
          time: `${key}:00`,
          count: groups[key],
        }))
        .sort((a, b) => Number(a.time.split(":")[0]) - Number(b.time.split(":")[0]));
    } else {
      insights.forEach((insight) => {
        const date = new Date(insight.timestamp);
        const key = date.toISOString().slice(0, 10);
        groups[key] = (groups[key] || 0) + 1;
      });
      return Object.keys(groups)
        .map((key) => ({
          time: key,
          count: groups[key],
        }))
        .sort((a, b) => new Date(a.time).getTime() - new Date(b.time).getTime());
    }
  };

  useEffect(() => {
    if (insights.length > 0) {
      setChartData(groupInsights(insights, selectedTimeframe));
    } else {
      setChartData([]);
    }
  }, [insights, selectedTimeframe]);

  return (
    <div className="space-y-6">
      {/* Metrics Cards */}
      <div className="grid grid-cols-3 gap-4">
        {metrics.map((metric) => (
          <Card key={metric.label} className="bg-secondary p-4">
            <h3 className="text-sm text-muted-foreground">{metric.label}</h3>
            <p className="text-2xl font-bold text-foreground">{metric.value}</p>
          </Card>
        ))}
      </div>

      {/* Insights Stats Chart */}
      <Card className="bg-secondary p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">Insights stats</h2>
          <div className="space-x-2">
            {timeframes.map((tf) => (
              <Button
                key={tf}
                variant={selectedTimeframe === tf ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedTimeframe(tf)}
              >
                {tf}
              </Button>
            ))}
          </div>
        </div>
        <div className="h-64 bg-muted">
          {chartLoading ? (
            <p className="flex h-full items-center justify-center text-muted-foreground">
              Loading chart...
            </p>
          ) : chartError ? (
            <p className="flex h-full items-center justify-center text-red-500">
              Error loading chart
            </p>
          ) : chartData.length === 0 ? (
            <p className="flex h-full items-center justify-center text-muted-foreground">
              No data available
            </p>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="time" />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Line type="monotone" dataKey="count" stroke="#8884d8" strokeWidth={2} dot />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>
      </Card>

      {/* Insights Table */}
      <Card className="bg-secondary p-4">
        <div className="mb-4 flex justify-between items-center">
          <h2 className="text-xl font-bold text-foreground">Latest Insights</h2>
          <Link href="/dashboard/insights" passHref>
            <Button variant="outline">View All</Button>
          </Link>
        </div>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="text-muted-foreground">Sender</TableHead>
              <TableHead className="text-muted-foreground">Asset</TableHead>
              <TableHead className="text-muted-foreground">Price</TableHead>
              <TableHead className="text-muted-foreground">24h Change</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {insights.slice(0, 5).map((insight) => (
              <TableRow key={insight.contract}>
                <TableCell className="text-foreground">{insight.sender}</TableCell>
                <TableCell className="text-foreground">{insight.symbol}</TableCell>
                <TableCell className="text-foreground">{insight.price}</TableCell>
                <TableCell 
                  className={`${
                    insight.price_change_24h?.startsWith("-")
                      ? "text-red-500"
                      : "text-green-500"
                  }`}
                >
                  {insight.price_change_24h}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Card>
    </div>
  );
}
