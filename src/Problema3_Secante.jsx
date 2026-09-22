import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import upeuLogo from './assets/upeu-logo.png'

function f(x) { return Math.exp(-x) - x * x + 0.2 }

function secante(x0, x1, tol, maxIter) {
  const rows = []
  let xPrev = x0, xn = x1
  for (let i = 1; i <= maxIter; i++) {
    const fPrev = f(xPrev)
    const fxn = f(xn)
    if (Math.abs(fxn - fPrev) < 1e-14) { rows.push({ iter: i, xPrev, xn, fPrev, fxn, xn1: NaN, error: null, cumple: 'error: f(xn)≈f(xn-1)' }); break }
    const xn1 = xn - fxn * (xn - xPrev) / (fxn - fPrev)
    const error = Math.abs((xn1 - xn) / xn1) * 100
    const cumple = error < tol
    rows.push({ iter: i, xPrev, xn, fPrev, fxn, xn1, error, cumple: cumple ? 'sí' : 'no' })
    if (cumple) break
    xPrev = xn
    xn = xn1
  }
  return rows
}

const cardTransition = { type: 'spring', stiffness: 300, damping: 20 }

function SolutionButton({ onClick, label = 'Ver solución' }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 hover:bg-cyan-500/30 whitespace-nowrap ml-3 shrink-0">
      {label}
    </button>
  )
}

function SolutionModal({ open, onClose, title, wide, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
        className={`${wide ? 'max-w-6xl' : 'max-w-2xl'} w-full max-h-[88vh] overflow-y-auto bg-slate-950 border border-cyan-500/30 rounded-2xl p-8 shadow-[0_0_80px_rgba(56,189,248,0.2)]`}>
        <div className="flex justify-between items-center mb-6 sticky -top-8 bg-slate-950/95 backdrop-blur pt-2 pb-3 -mt-2 z-10">
          <h2 className="text-2xl font-bold text-cyan-300">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">{children}</div>
      </motion.div>
    </div>
  )
}

function ValuesPanel({ x0, x1, tol, setX0, setX1, setTol, error }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition}
      className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-cyan-300 mb-3">Seleccionar valores iniciales</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="text-sm text-slate-400">x₀
          <input type="text" inputMode="decimal" value={x0} onChange={(e) => setX0(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">x₁
          <input type="text" inputMode="decimal" value={x1} onChange={(e) => setX1(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">Tolerancia εa (%)
          <input type="text" inputMode="decimal" value={tol} onChange={(e) => setTol(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
      </div>
      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      <p className="text-slate-500 text-xs mt-3">Al cambiar x₀, x₁ o la tolerancia, tabla, gráfico e interpretación se recalculan al instante.</p>
    </motion.div>
  )
}

function ContextSolution({ x0, x1 }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Dato</h3><p>f(x) = e^(−x) − x² + 0.2 = 0. No requiere f'(x): usa dos puntos iniciales.</p></div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Evaluación de x₀, x₁</h3>
        <p>f({x0}) = {f(x0).toFixed(4)}</p>
        <p>f({x1}) = {f(x1).toFixed(4)}</p>
      </div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula</h3><p>x_(n+1) = x_n − f(x_n)·(x_n − x_(n−1)) / (f(x_n) − f(x_(n−1)))</p></div>
    </>
  )
}

function GraphSolution({ raiz }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Qué muestra</h3><p>Error relativo εa (%) por iteración. La secante tiene convergencia superlineal (~1.618), más rápida que punto fijo, algo más lenta que Newton.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Lectura</h3><p>{raiz ? `Converge a x ≈ ${raiz.xn1.toFixed(4)}.` : 'No converge (revisa que f(xn) y f(xn-1) no sean casi iguales).'}</p></div>
    </>
  )
}

function TableSolution({ rows }) {
  if (!rows.length) return <p>Sin iteraciones válidas.</p>
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula</h3><p className="bg-white/5 rounded-lg p-3 inline-block">x_(n+1) = x_n − f(x_n)·(x_n−x_(n-1)) / (f(x_n)−f(x_(n-1)))　　εa = |x_(n+1)−x_n| / x_(n+1) × 100</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.iter} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-cyan-300 font-semibold mb-1">Iteración {r.iter}</p>
            <p>x_(n-1) = {r.xPrev.toFixed(6)}, x_n = {r.xn.toFixed(6)}</p>
            <p>f(x_(n-1)) = {r.fPrev.toFixed(6)}, f(x_n) = {r.fxn.toFixed(6)}</p>
            <p>x_(n+1) = {Number.isNaN(r.xn1) ? '—' : r.xn1.toFixed(6)}</p>
            <p>εa = {r.error === null ? '—' : r.error.toFixed(6) + '%'}</p>
            <p className={`font-semibold mt-1 ${r.cumple === 'sí' ? 'text-emerald-400' : 'text-slate-500'}`}>¿εa &lt; tol? → {r.cumple}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function InterpretationSolution({ raiz, rows }) {
  if (!raiz) return <p>Ajusta x₀ y x₁ para lograr convergencia.</p>
  return (
    <>
      <p>Tras {rows.length} iteraciones, x ≈ {raiz.xn1.toFixed(4)}, εa = {raiz.error?.toFixed(6)}%.</p>
      <p>Ese valor de x es el nivel de carga normalizado en el que el servidor alcanza su punto de operación estable según el modelo.</p>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Verificación</h3>
        <p>Se sustituye x≈{raiz.xn1.toFixed(4)} en la función original f(x) = e^(−x) − x² + 0.2:</p>
        <p>f({raiz.xn1.toFixed(4)}) = {f(raiz.xn1).toFixed(6)} ≈ 0 → confirma que es raíz.</p>
      </div>
    </>
  )
}

function SpinningLogo() {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      className="fixed top-4 right-16 z-40 w-20 h-20 rounded-full overflow-hidden border border-cyan-400/40 shadow-[0_0_25px_rgba(56,189,248,0.35)] bg-slate-950">
      <img src={upeuLogo} alt="UPeU" className="w-full h-full object-cover" />
    </motion.div>
  )
}

export default function Problema3_Secante() {
  const [x0Str, setX0Str] = useState('0')
  const [x1Str, setX1Str] = useState('1')
  const [tolStr, setTolStr] = useState('0.01')
  const x0 = x0Str === '' ? NaN : Number(x0Str)
  const x1 = x1Str === '' ? NaN : Number(x1Str)
  const tol = tolStr === '' ? NaN : Number(tolStr)

  const inputError = (x0Str === '' || x1Str === '' || tolStr === '') ? 'Completa x₀, x₁ y la tolerancia.'
    : Number.isNaN(x0) || Number.isNaN(x1) || Number.isNaN(tol) ? 'Valores inválidos.'
    : x0 === x1 ? 'x₀ y x₁ deben ser distintos.'
    : Math.abs(f(x1) - f(x0)) < 1e-10 ? 'f(x₀) y f(x₁) son casi iguales: división inestable. Prueba otros valores.'
    : null

  const rows = useMemo(() => (inputError ? [] : secante(x0, x1, tol, 50)), [x0, x1, tol, inputError])
  const raiz = rows.length && !Number.isNaN(rows[rows.length - 1].xn1) ? rows[rows.length - 1] : null
  const chartData = rows.map(r => ({ iter: r.iter, error: r.error === null ? 0 : r.error }))

  const [openSection, setOpenSection] = useState(null)
  const modalConfig = {
    context: { title: 'Solución — Contexto y puntos iniciales', wide: false, content: <ContextSolution x0={Number.isNaN(x0) ? 0 : x0} x1={Number.isNaN(x1) ? 1 : x1} /> },
    graph: { title: 'Solución — Gráfico de convergencia', wide: false, content: <GraphSolution raiz={raiz} /> },
    table: { title: 'Solución — Tabla de iteraciones', wide: true, content: <TableSolution rows={rows} /> },
    interpretation: { title: 'Solución — Interpretación', wide: false, content: <InterpretationSolution raiz={raiz} rows={rows} /> },
  }
  const active = openSection ? modalConfig[openSection] : null

  return (
    <div className="relative text-slate-100 p-6 md:p-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div animate={{ x: [0, 200, -50, 0], y: [0, 100, -80, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/40 rounded-full blur-[100px]" />
        <motion.div animate={{ x: [0, -150, 60, 0], y: [0, -100, 50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/40 rounded-full blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1400px] mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Problema 3 — Método de la Secante</h1>
        <p className="text-slate-400 mt-2">Optimización del rendimiento de un servidor</p>

        <ValuesPanel x0={x0Str} x1={x1Str} tol={tolStr} setX0={setX0Str} setX1={setX1Str} setTol={setTolStr} error={inputError} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <p className="text-slate-300">f(x) = e^(−x) − x² + 0.2 = 0</p>
            <SolutionButton onClick={() => setOpenSection('context')} />
          </div>
          <p className="text-sm text-slate-500 mt-2">{Number.isNaN(x0) || Number.isNaN(x1) ? 'Completa x₀ y x₁.' : `x₀=${x0}, x₁=${x1} — f(x₀)=${f(x0).toFixed(4)}, f(x₁)=${f(x1).toFixed(4)}`}</p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(56,189,248,0.15)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-cyan-300">Gráfico de convergencia (εa vs iteración)</h2>
            <SolutionButton onClick={() => setOpenSection('graph')} />
          </div>
          <ResponsiveContainer width="100%" height={400}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="iter" stroke="#94a3b8" tick={{ fontSize: 12 }} label={{ value: 'Iteración', position: 'insideBottom', offset: -5, fill: '#94a3b8' }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} label={{ value: 'εa (%)', angle: -90, position: 'insideLeft', fill: '#94a3b8' }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <Line type="monotone" dataKey="error" stroke="#38bdf8" strokeWidth={3} dot={{ r: 3 }} style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-cyan-300">Tabla de iteraciones</h2>
            <SolutionButton onClick={() => setOpenSection('table')} label="Ver solución detallada" />
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-white/10">{['Iter.', 'x_(n-1)', 'x_n', 'f(x_(n-1))', 'f(x_n)', 'x_(n+1)', 'εa (%)', 'Cumple'].map(h => <th className="text-left py-2 px-2" key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence>
                {rows.map((r) => (
                  <motion.tr key={r.iter} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5">
                    <td className="py-1.5 px-2">{r.iter}</td>
                    <td className="py-1.5 px-2">{r.xPrev.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.xn.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fPrev.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fxn.toFixed(6)}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{Number.isNaN(r.xn1) ? '—' : r.xn1.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.error === null ? '—' : r.error.toFixed(6)}</td>
                    <td className={`py-1.5 px-2 font-semibold ${r.cumple === 'sí' ? 'text-emerald-400' : 'text-slate-500'}`}>{r.cumple}</td>
                  </motion.tr>
                ))}
              </AnimatePresence>
            </tbody>
          </table>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="mt-6 mb-10 backdrop-blur-md bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border border-emerald-400/20 rounded-2xl p-6">
          <div className="flex justify-between items-start mb-2">
            <h2 className="text-lg font-semibold text-emerald-300">Interpretación</h2>
            <SolutionButton onClick={() => setOpenSection('interpretation')} />
          </div>
          {raiz ? (
            <p className="text-slate-300">Tras {rows.length} iteraciones, x ≈ <span className="font-bold text-emerald-300">{raiz.xn1.toFixed(4)}</span>, εa = {raiz.error?.toFixed(6)}%.</p>
          ) : <p className="text-rose-400">{inputError}</p>}
        </motion.div>
      </motion.div>

      <SolutionModal open={!!active} onClose={() => setOpenSection(null)} title={active?.title} wide={active?.wide}>{active?.content}</SolutionModal>
    </div>
  )
}
