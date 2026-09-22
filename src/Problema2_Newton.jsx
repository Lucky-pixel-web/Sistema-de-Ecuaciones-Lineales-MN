import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import upeuLogo from './assets/upeu-logo.png'

// f(t): función original del problema, se busca su raíz positiva
function f(t) { return Math.pow(t, 3) - 7 * t - 5 }
// fPrime(t): derivada de f, necesaria para la fórmula de Newton-Raphson
function fPrime(t) { return 3 * t * t - 7 }

// newtonRaphson: aplica t_(n+1) = t_n - f(t_n)/f'(t_n) hasta converger o llegar a maxIter
function newtonRaphson(x0, tol, maxIter) {
  const rows = []
  let xn = x0
  for (let i = 0; i <= maxIter; i++) {
    const fxn = f(xn)
    const fpxn = fPrime(xn)
    // si la derivada es casi cero, la fórmula se vuelve inestable (división por ~0)
    if (Math.abs(fpxn) < 1e-12) { rows.push({ iter: i, xn, fxn, fpxn, xn1: NaN, error: null, cumple: 'error: f\'(x)≈0' }); break }
    const xn1 = xn - fxn / fpxn // fórmula de Newton-Raphson
    const error = i === 0 ? null : Math.abs((xn1 - xn) / xn1) * 100 // error relativo porcentual
    const cumple = error !== null && error < tol // criterio de parada
    rows.push({ iter: i, xn, fxn, fpxn, xn1, error, cumple: error === null ? '—' : (cumple ? 'sí' : 'no') })
    if (cumple) break
    xn = xn1 // avanza a la siguiente iteración
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

function ValuesPanel({ x0, tol, setX0, setTol, error }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition}
      className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-cyan-300 mb-3">Seleccionar valor inicial</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-slate-400">t₀ (ms)
          <input type="text" inputMode="decimal" value={x0} onChange={(e) => setX0(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">Tolerancia εa (%)
          <input type="text" inputMode="decimal" value={tol} onChange={(e) => setTol(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
      </div>
      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      <p className="text-slate-500 text-xs mt-3">Al cambiar t₀ o la tolerancia, tabla, gráfico e interpretación se recalculan al instante.</p>
    </motion.div>
  )
}

function ContextSolution({ x0 }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Dato</h3><p>f(t) = t³ − 7t − 5 = 0, f'(t) = 3t² − 7. Se busca la raíz positiva.</p></div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Elección de t₀</h3>
        <p>f({x0}) = {f(x0).toFixed(4)}, f'({x0}) = {fPrime(x0).toFixed(4)}. Como f'(t₀)≠0 y f es suave (polinomio), Newton converge localmente si t₀ está razonablemente cerca de la raíz.</p>
      </div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula</h3><p>t_(n+1) = t_n − f(t_n)/f'(t_n)</p></div>
    </>
  )
}

function GraphSolution({ raiz }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Qué muestra</h3><p>Error relativo εa (%) por iteración. Newton-Raphson tiene convergencia cuadrática: el error cae muy rápido.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Lectura</h3><p>{raiz ? `Converge a t ≈ ${raiz.xn1.toFixed(4)} ms.` : 'No converge (revisa t₀, f\'(t) puede anularse cerca de él).'}</p></div>
    </>
  )
}

function TableSolution({ rows }) {
  if (!rows.length) return <p>Sin iteraciones válidas.</p>
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula</h3><p className="bg-white/5 rounded-lg p-3 inline-block">t_(n+1) = t_n − f(t_n)/f'(t_n)　　εa = |t_(n+1) − t_n| / t_(n+1) × 100</p></div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.iter} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-cyan-300 font-semibold mb-1">Iteración {r.iter}</p>
            <p>t_n = {r.xn.toFixed(6)}</p>
            <p>f(t_n) = {r.fxn.toFixed(6)}</p>
            <p>f'(t_n) = {r.fpxn.toFixed(6)}</p>
            <p>t_(n+1) = {Number.isNaN(r.xn1) ? '—' : r.xn1.toFixed(6)}</p>
            <p>εa = {r.error === null ? '—' : r.error.toFixed(6) + '%'}</p>
            <p className={`font-semibold mt-1 ${r.cumple === 'sí' ? 'text-emerald-400' : 'text-slate-500'}`}>¿εa &lt; tol? → {r.cumple}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function InterpretationSolution({ raiz, rows }) {
  if (!raiz) return <p>Ajusta t₀ para lograr convergencia.</p>
  return (
    <>
      <p>Tras {rows.length - 1} iteraciones, t ≈ {raiz.xn1.toFixed(4)} ms, εa = {raiz.error?.toFixed(6)}%.</p>
      <p>Ese es el tiempo de respuesta del sistema de almacenamiento bajo la condición de operación modelada; permite dimensionar la capacidad necesaria para no exceder ese tiempo.</p>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Verificación</h3>
        <p>Se sustituye t≈{raiz.xn1.toFixed(4)} en la función original f(t) = t³ − 7t − 5:</p>
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

export default function Problema2_Newton() {
  const [x0Str, setX0Str] = useState('3')
  const [tolStr, setTolStr] = useState('0.01')
  const x0 = x0Str === '' ? NaN : Number(x0Str)
  const tol = tolStr === '' ? NaN : Number(tolStr)

  const inputError = (x0Str === '' || tolStr === '') ? 'Completa t₀ y la tolerancia.'
    : Number.isNaN(x0) || Number.isNaN(tol) ? 'Valores inválidos.'
    : Math.abs(fPrime(x0)) < 1e-6 ? "f'(t₀) ≈ 0: división inestable, prueba otro t₀."
    : null

  const rows = useMemo(() => (inputError ? [] : newtonRaphson(x0, tol, 50)), [x0, tol, inputError])
  const raiz = rows.length && !Number.isNaN(rows[rows.length - 1].xn1) ? rows[rows.length - 1] : null
  const chartData = rows.map(r => ({ iter: r.iter, error: r.error === null ? 0 : r.error }))

  const [openSection, setOpenSection] = useState(null)
  const modalConfig = {
    context: { title: 'Solución — Contexto y elección de t₀', wide: false, content: <ContextSolution x0={Number.isNaN(x0) ? 3 : x0} /> },
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
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Problema 2 — Método de Newton-Raphson</h1>
        <p className="text-slate-400 mt-2">Dimensionamiento de un sistema de almacenamiento</p>

        <ValuesPanel x0={x0Str} tol={tolStr} setX0={setX0Str} setTol={setTolStr} error={inputError} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <p className="text-slate-300">f(t) = t³ − 7t − 5 = 0</p>
            <SolutionButton onClick={() => setOpenSection('context')} />
          </div>
          <p className="text-sm text-slate-500 mt-2">{Number.isNaN(x0) ? 'Completa t₀.' : `t₀ = ${x0} — f(t₀) = ${f(x0).toFixed(4)}, f'(t₀) = ${fPrime(x0).toFixed(4)}`}</p>
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
            <thead><tr className="text-slate-400 border-b border-white/10">{['Iter.', 't_n', 'f(t_n)', "f'(t_n)", 't_(n+1)', 'εa (%)', 'Cumple'].map(h => <th className="text-left py-2 px-2" key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence>
                {rows.map((r) => (
                  <motion.tr key={r.iter} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5">
                    <td className="py-1.5 px-2">{r.iter}</td>
                    <td className="py-1.5 px-2">{r.xn.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fxn.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fpxn.toFixed(6)}</td>
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
            <p className="text-slate-300">Tras {rows.length - 1} iteraciones, t ≈ <span className="font-bold text-emerald-300">{raiz.xn1.toFixed(4)} ms</span>, εa = {raiz.error?.toFixed(6)}%.</p>
          ) : <p className="text-rose-400">{inputError}</p>}
        </motion.div>
      </motion.div>

      <SolutionModal open={!!active} onClose={() => setOpenSection(null)} title={active?.title} wide={active?.wide}>{active?.content}</SolutionModal>
    </div>
  )
}
