import { useState } from 'react'
import { Pie, Bar } from 'react-chartjs-2'
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js'
import { LayoutDashboard, FileText, Download } from 'lucide-react'
ChartJS.register(ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title)

function App() {
  const [file, setFile] = useState(null)
  const [inputPreview, setInputPreview] = useState([])
  const [results, setResults] = useState([])
  const [outputPreview, setOutputPreview] = useState([])
  const [statsTable, setStatsTable] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const handleFileChange = async (e) => {
    const f = e.target.files[0]
    setFile(f)
    setResults([])
    setOutputPreview([])
    setStatsTable([])
    if (f) {
      const formData = new FormData()
      formData.append('file', f)
      try {
        const res = await fetch('http://localhost:8000/preview', {
          method: 'POST',
          body: formData,
        })
        if (!res.ok) throw new Error('Preview failed')
        const data = await res.json()
        setInputPreview(data.preview || [])
      } catch (err) {
        setInputPreview([])
        setError(err.message)
      }
    } else {
      setInputPreview([])
    }
  }

  const handleClassify = async () => {
    if (!file) return
    setLoading(true)
    setError(null)
    setResults([])
    setOutputPreview([])
    setStatsTable([])
    const formData = new FormData()
    formData.append('file', file)
    try {
      const res = await fetch('http://localhost:8000/upload', {
        method: 'POST',
        body: formData,
      })
      if (!res.ok) throw new Error('Classification failed')
      const data = await res.json()
      setResults(data.results || [])
      setOutputPreview(data.output_preview || [])
      setStatsTable(data.stats_table || [])
    } catch (err) {
      setError(err.message)
    }
    setLoading(false)
  }

  const handleDownload = () => {
    window.open('http://localhost:8000/download', '_blank')
  }

  // Pie chart data
  const pieData = {
    labels: statsTable.map(row => row.log_class),
    datasets: [
      {
        data: statsTable.map(row => row.count),
        backgroundColor: [
          '#6366f1', '#22d3ee', '#f59e42', '#f43f5e', '#10b981', '#eab308', '#a78bfa'
        ],
      },
    ],
  }

  // Pie chart options for bigger legend and chart
  const pieOptions = {
    plugins: {
      legend: {
        display: true,
        position: 'right',
        labels: {
          font: {
            size: 18
          }
        }
      }
    }
  }

  // --- Bar chart for label counts ---
  const barData = {
    labels: statsTable.map(row => row.log_class),
    datasets: [
      {
        label: 'Log Count',
        data: statsTable.map(row => row.count),
        backgroundColor: [
          '#6366f1', '#22d3ee', '#f59e42', '#f43f5e', '#10b981', '#eab308', '#a78bfa'
        ],
      },
    ],
  }
  const barOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      title: { display: true, text: 'Log Count by Class', font: { size: 18 } }
    },
    scales: {
      x: { ticks: { font: { size: 14 } } },
      y: { beginAtZero: true, ticks: { font: { size: 14 } } }
    }
  }

  // --- Source distribution pie charts for each class ---
  const classSourcePieData = statsTable.map(row => {
    const classLabel = row.log_class
    // Count sources for this class
    const sourceCount = {}
    results.forEach(r => {
      if (r.predicted_label === classLabel) {
        sourceCount[r.source] = (sourceCount[r.source] || 0) + 1
      }
    })
    const labels = Object.keys(sourceCount)
    const data = Object.values(sourceCount)
    // Use a color palette, repeat if needed
    const palette = [
      '#6366f1', '#22d3ee', '#f59e42', '#f43f5e', '#10b981', '#eab308', '#a78bfa', '#f472b6', '#facc15', '#60a5fa'
    ]
    return {
      classLabel,
      data: {
        labels,
        datasets: [
          {
            data,
            backgroundColor: labels.map((_, i) => palette[i % palette.length])
          }
        ]
      }
    }
  })

  // --- Output Statistics Calculations ---
  const totalLogs = statsTable.reduce((sum, row) => sum + row.count, 0)
  const classDiversity = statsTable.length
  const maxCount = Math.max(...statsTable.map(row => row.count), 0)
  const minCount = Math.min(...statsTable.map(row => row.count), Infinity)
  const mostFrequent = statsTable.filter(row => row.count === maxCount).map(row => row.log_class)
  const leastFrequent = statsTable.filter(row => row.count === minCount).map(row => row.log_class)

  // --- Source statistics ---
  // Compute source counts from results
  const sourceCounts = results.reduce((acc, row) => {
    acc[row.source] = (acc[row.source] || 0) + 1
    return acc
  }, {})
  const maxSourceCount = Math.max(...Object.values(sourceCounts), 0)
  const minSourceCount = Math.min(...Object.values(sourceCounts), Infinity)
  const mostLogSources = Object.entries(sourceCounts)
    .filter(([_, count]) => count === maxSourceCount)
    .map(([src]) => src)
  const leastLogSources = Object.entries(sourceCounts)
    .filter(([_, count]) => count === minSourceCount)
    .map(([src]) => src)

  // --- Sources per class ---
  // For each class, collect unique sources
  const classSources = {}
  results.forEach(row => {
    if (!classSources[row.predicted_label]) classSources[row.predicted_label] = new Set()
    classSources[row.predicted_label].add(row.source)
  })

  // --- Download statistics as CSV ---
  const handleDownloadStats = () => {
    if (!statsTable.length) return
    const header = "Log Class,Count,Percentage,Sources\n"
    const rows = statsTable.map(row =>
      `${row.log_class},${row.count},${((row.count / totalLogs) * 100).toFixed(1)}%,"${[...(classSources[row.log_class] || [])].join(', ')}"`
    ).join("\n")
    const csv = header + rows
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = "log_statistics.csv"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // --- Log class filter state ---
  const logClasses = [
    'All','HTTP Status', 'Critical Error', 'Security Alert', 'Error',
    'System Notification', 'Resource Usage', 'User Action',
    'Workflow Error', 'Deprecation Warning'
  ]
  const [selectedClass, setSelectedClass] = useState('All')

  // Filtered results for output table
  const filteredResults = selectedClass === 'All'
    ? results
    : results.filter(row => row.predicted_label === selectedClass)

  return (
    <div className="w-screen min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex flex-col items-center justify-center py-8">
      <h1 className="text-3xl font-bold text-indigo-700 mb-4 text-center">Log Classification System</h1>
      <p className="text-gray-600 text-center mb-6">Classify logs with AI. Upload your log file and get instant predictions!</p>
      {/* Description Container */}
      <div className="bg-indigo-50 border border-indigo-200 rounded-lg shadow-sm p-6 mb-2 w-full max-w-2xl text-lg">
        <div className="mb-3">
          <span className="font-semibold text-indigo-700">How it works:</span>
          <ul className="list-disc list-inside text-gray-700 mt-1 text-base">
            <li>Upload your log file using the "Choose file" button below in Dashboard.</li>
            <li>Our AI model will analyze each log entry and classify it automatically like Categories like: HTTP Status, Critical Error, etc.</li>
            <li>Get instant predictions, statistics, and visualizations for your logs.</li>
          </ul>
        </div>
        <div className="mb-3">
          <span className="font-semibold text-indigo-700">Input file format:</span>
          <ul className="list-disc list-inside text-gray-700 mt-1 text-base">
            <li>The file should be a <span className="font-mono bg-indigo-100 px-1 rounded">.csv</span> with columns: <span className="font-mono bg-indigo-100 px-1 rounded">source</span> (source of log file), <span className="font-mono bg-indigo-100 px-1 rounded">log_message</span> (the log message).</li>
            <li>Example:
              <div className="bg-white border border-gray-200 rounded p-2 mt-1 text-xs font-mono">
                source, log_message<br />
                Billing System, Failed to connect to database<br />
                CRM, User login successful
              </div>
            </li>
          </ul>
        </div>
        <div>
          <span className="font-semibold text-indigo-700">What you get:</span>
          <ul className="list-disc list-inside text-gray-700 mt-1 text-base">
            <li>A downloadable <span className="font-mono bg-indigo-100 px-1 rounded">output.csv</span> with predicted labels for each log entry.</li>
            <li>Statistics and summary of log classes.</li>
            <li>Mutliple pie chart and bar graphs visualizing the distribution of predicted classes.</li>
            <li>Full output table with all classified logs with Interactive filtering buttons</li>
          </ul>
        </div>
      </div>
      {/* End Description Container */}

      {/* Bouncing Down Arrow */}
      <div className="flex justify-center w-full mb-2">
        <svg
          className="animate-bounce"
          width="32"
          height="32"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#6366f1"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </div>
      {/* Dashboard Heading */}
      <div className="w-full max-w-2xl mb-2 justify-center text-center flex items-center gap-2 mt-6">
        <LayoutDashboard className="inline-block text-indigo-800" size={32} />
        <h2 className="text-3xl font-bold text-indigo-800 mb-2">Dashboard</h2>
      </div>
      <div className="bg-white rounded-xl shadow-lg p-8 w-[95%] flex flex-col items-center">
        {/* Centered file input */}
        <div className="flex justify-center items-center w-full mb-6">
          <label
            htmlFor="file-upload"
            className="cursor-pointer bg-indigo-50 text-indigo-700 font-semibold py-2 px-6 rounded-full shadow hover:bg-indigo-100 transition text-center flex items-center gap-2"
            style={{ display: 'inline-block' }}
          >
            <FileText className="inline-block mr-2" size={20} />
            Choose file
            <input
              id="file-upload"
              type="file"
              accept=".csv"
              onChange={handleFileChange}
              className="hidden"
            />
          </label>
          <span className="ml-4 text-gray-500 text-sm">
            {file ? file.name : 'No file chosen'}
          </span>
        </div>
        {/* Input Preview */}
        {inputPreview.length > 0 && (
          <div className="w-full mb-4 flex flex-col">
            <div className="mb-4 font-bold text-indigo-700 text-2xl items-center">Input Preview</div>
            <div className="overflow-x-auto rounded border border-gray-200 max-h-32 mb-4 w-full" style={{maxHeight: '8rem', minHeight: '3rem', overflowY: 'auto'}}>
              <table className="min-w-full bg-white text-gray-900 text-xs">
                <thead>
                  <tr>
                    <th className="px-2 py-1 border-b text-left font-semibold">Source</th>
                    <th className="px-2 py-1 border-b text-left font-semibold">Log Message</th>
                  </tr>
                </thead>
                <tbody>
                  {inputPreview.map((row, idx) => (
                    <tr key={idx} className="hover:bg-indigo-50">
                      <td className="px-2 py-1 border-b">{row.source}</td>
                      <td className="px-2 py-1 border-b">{row.log_message}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            {/* Centered Classify Button */}
            <button
              className="bg-indigo-50 text-indigo-700 font-semibold py-2 px-6 rounded-full shadow hover:bg-indigo-100 border border-indigo-200 transition mx-auto"
              onClick={handleClassify}
              disabled={!file || loading}
            >
              {loading ? 'Classifying logs...' : 'Classify Logs'}
            </button>
          </div>
        )}
        {/* Divider between input and output */}
        {inputPreview.length > 0 && results.length > 0 && (
          <hr className="w-full border-t-2 border-indigo-300 my-8" />
        )}
        {error && <div className="text-red-500 text-center mb-4">{error}</div>}
        {/* Output Preview, Stats, Pie Chart, Results */}
        {results.length > 0 && (
          <div className="mt-6 w-full flex flex-col items-center">
            {/* Output Preview */}
            <div className="w-full items-center">
              <div className="mb-4 font-bold text-indigo-700 text-2xl items-center">Output Preview</div>
              <div className="overflow-x-auto rounded border border-gray-200 max-h-32 mb-2 w-full" style={{maxHeight: '8rem', minHeight: '3rem', overflowY: 'auto'}}>
                <table className="min-w-full bg-white text-gray-900 text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b text-left font-semibold">Source</th>
                      <th className="px-2 py-1 border-b text-left font-semibold">Log Message</th>
                      <th className="px-2 py-1 border-b text-left font-semibold">Predicted Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outputPreview.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50">
                        <td className="px-2 py-1 border-b">{row.source}</td>
                        <td className="px-2 py-1 border-b">{row.log_message}</td>
                        <td className="px-2 py-1 border-b">{row.predicted_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {/* Centered Download Button */}
              <div className="flex justify-center mb-4 mt-4">
                <button
                  className="bg-indigo-50 text-indigo-700 px-4 py-2 rounded-full shadow border border-indigo-200 hover:bg-indigo-100 font-semibold transition flex flex-row items-center justify-center"
                  onClick={handleDownload}
                >
                  <Download className="inline-block mr-2" size={20} />
                  Download Output CSV
                </button>
              </div>
            </div>
            {/* Divider */}
            <hr className="w-full border-t-2 border-indigo-200 my-8" />
            {/* Stats Section: Side-by-side layout */}
          <div className="font-bold text-indigo-700 mb-8 text-2xl text-center">Output Statistics</div>
            <div className="mb-8 flex flex-row items-center mt-4">
              {/* Stats Summary */}
              <div className="flex flex-col gap-4 justify-center mb-4">
                <div className="bg-indigo-50 border border-indigo-200 rounded px-4 py-2 text-indigo-800 font-semibold text-base">
                  Total Logs: <span className="font-bold">{totalLogs}</span>
                </div>
                <div className="bg-indigo-50 border border-indigo-200 rounded px-4 py-2 text-indigo-800 font-semibold text-base">
                  Unique Classes: <span className="font-bold">{classDiversity}</span>
                </div>
                <div className="bg-pink-50 border border-pink-200 rounded px-4 py-2 text-pink-800 font-semibold text-base">
                  Most Frequent: <span className="font-bold">{mostFrequent.join(", ")}</span> ({maxCount})
                </div>
                <div className="bg-green-50 border border-green-200 rounded px-4 py-2 text-green-800 font-semibold text-base">
                  Least Frequent: <span className="font-bold">{leastFrequent.join(", ")}</span> ({minCount})
                </div>
                <div className="bg-blue-50 border border-blue-200 rounded px-4 py-2 text-blue-800 font-semibold text-base">
                  Sources with Most Logs: <span className="font-bold">{mostLogSources.join(", ")}</span> ({maxSourceCount})
                </div>
                <div className="bg-yellow-50 border border-yellow-200 rounded px-4 py-2 text-yellow-800 font-semibold text-base">
                  Sources with Least Logs: <span className="font-bold">{leastLogSources.join(", ")}</span> ({minSourceCount})
                </div>
              </div>
              <div className="flex flex-col md:flex-row w-full justify-center gap-8 items-start">
                {/* Right: Stats Table */}
                <div className="flex-1 min-w-[500px] max-w-xs overflow-x-auto rounded border border-gray-200 bg-white shadow-sm">
                  <table className="min-w-full text-gray-900 text-base">
                    <thead>
                      <tr>
                        <th className="px-3 py-2 border-b text-left font-semibold">Log Class</th>
                        <th className="px-3 py-2 border-b text-left font-semibold">Count</th>
                        <th className="px-3 py-2 border-b text-left font-semibold">Percentage</th>
                        <th className="px-3 py-2 border-b text-left font-semibold">Sources</th>
                      </tr>
                    </thead>
                    <tbody>
                      {statsTable.map((row, idx) => {
                        const percent = totalLogs ? ((row.count / totalLogs) * 100).toFixed(1) : "0.0"
                        const isMost = row.count === maxCount
                        const isLeast = row.count === minCount
                        const sources = classSources[row.log_class] ? [...classSources[row.log_class]].join(", ") : ""
                        return (
                          <tr
                            key={idx}
                            className={
                              isMost
                                ? "bg-red-100 font-semibold"
                                : isLeast
                                ? "bg-green-100 font-semibold"
                                : ""
                            }
                          >
                            <td className="px-3 py-2 border">{row.log_class}</td>
                            <td className="px-3 py-2 border">{row.count}</td>
                            <td className="px-3 py-2 border">{percent}%</td>
                            <td className="px-3 py-2 border">{sources}</td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                  {/* Download statistics button */}
                  <div className="flex justify-center p-3">
                    <button
                      className="bg-indigo-50 text-indigo-700 px-3 py-2 rounded-full shadow border border-indigo-200 hover:bg-indigo-100 font-semibold transition flex items-center"
                      onClick={handleDownloadStats}
                    >
                      <Download className="inline-block mr-2 justify-center text-center" size={20} />
                      Download Statistics CSV
                    </button>
                  </div>
                </div>
              </div>
            </div>
            {/* Divider */}
            <hr className="w-full border-t-2 border-indigo-200 my-8" />
            {/* Visualization Section */}
            <div className="mb-8 w-full flex flex-col items-center">
              <div className="font-bold text-indigo-700 text-3xl text-center mb-8 flex flex-col">Visualization</div>
              {/* Flex row for main charts */}
              <div className="w-full flex flex-row flex-wrap justify-center items-start gap-24 mb-6">
                {/* Pie Chart: Class Distribution */}
                <div className="flex flex-col items-center">
                  <div className="w-96 h-96 flex items-center justify-center">
                    <Pie data={pieData} options={{
                      ...pieOptions,
                      plugins: { ...pieOptions.plugins, title: { display: true, text: 'Class Distribution', font: { size: 24} } }
                    }} width={380} height={380} />
                  </div>
                </div>
                {/* Bar Chart: Label Counts */}
                <div className="flex flex-col items-center">
                  <div className="w-120 h-96 flex items-center justify-center">
                    <Bar data={barData} options={barOptions} width={300} height={380} />
                  </div>
                </div>
              </div>
              {/* Per-class Source Distribution Pie Charts */}
              {classSourcePieData.length > 0 && (
                <div className="w-full flex flex-wrap gap-24 justify-center items-start mt-18">
                  {classSourcePieData.map((pie, idx) => (
                    <div key={pie.classLabel} className="flex flex-col items-center">
                      <div className="font-semibold text-indigo-700 text-lg">{pie.classLabel} - Source Distribution</div>
                      <div className="w-80 h-80 flex items-center justify-center">
                        <Pie data={pie.data} options={{
                          plugins: {
                            legend: { display: true, position: 'right', labels: { font: { size: 14 } } },
                            title: { display: false },
                          }
                        }} width={256} height={256} />
                      </div>
                    </div>
                  ))}
                </div>
              )}
              {/* Divider */}
              <hr className="w-full border-t-2 border-indigo-200 my-8" />
              {/* Full Results */}
              <div className="mb-6 font-bold text-indigo-700 text-2xl text-center w-full">Full Output</div>
              {/* Log class filter buttons */}
              <div className="flex flex-wrap gap-4 justify-center mb-4 text-base">
                {logClasses.map(cls => (
                  <button
                    key={cls}
                    className={
                      "px-3 py-2 rounded-full border transition bg-indigo-50 text-indigo-700 border-indigo-200 hover:bg-indigo-100 font-semibold"
                    }
                    onClick={() => setSelectedClass(cls)}
                  >
                    {cls}
                  </button>
                ))}
              </div>
              <div className="overflow-x-auto rounded border border-gray-200 max-h-72 w-full" style={{maxHeight: '18rem', minHeight: '6rem', overflowY: 'auto'}}>
                <table className="min-w-full bg-white text-gray-900 text-xs">
                  <thead>
                    <tr>
                      <th className="px-2 py-1 border-b text-left font-semibold">Source</th>
                      <th className="px-2 py-1 border-b text-left font-semibold">Log Message</th>
                      <th className="px-2 py-1 border-b text-left font-semibold">Predicted Label</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredResults.map((row, idx) => (
                      <tr key={idx} className="hover:bg-indigo-50">
                        <td className="px-2 py-1 border-b">{row.source}</td>
                        <td className="px-2 py-1 border-b">{row.log_message}</td>
                        <td className="px-2 py-1 border-b">{row.predicted_label}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default App


