import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import upeuLogo from './assets/upeu-logo.png'

// f(T) = T - 18 - 8e^(-0.15T) = 0  <=>  T = g(T) = 18 + 8e^(-0.15T)
// g(T): forma iterativa despejada de f(T)=0, usada para la sucesión T_(n+1)=g(T_n)
function g(T) { return 18 + 8 * Math.exp(-0.15 * T) }
// f(T): función original del problema (para verificar la solución al final)
function f(T) { return T - g(T) }
// gPrime(T): derivada de g(T); si |g'(T)|<1 cerca de la raíz, el método converge
function gPrime(T) { return -1.2 * Math.exp(-0.15 * T) }

// puntoFijo: aplica T_(n+1)=g(T_n) hasta que el error relativo εa < tol o se llega a maxIter
function puntoFijo(T0, tol, maxIter) {
  const rows = []
  let Tn = T0
  for (let i = 0; i <= maxIter; i++) {
    const gTn = g(Tn) // siguiente aproximación
    const error = i === 0 ? null : Math.abs((gTn - Tn) / gTn) * 100 // error relativo porcentual
    const cumple = error !== null && error < tol // criterio de parada
    rows.push({ iter: i, Tn, gTn, fTn: f(Tn), error, cumple: error === null ? '—' : (cumple ? 'sí' : 'no') })
    if (cumple) break
    Tn = gTn // avanza a la siguiente iteración
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

function ValuesPanel({ T0, tol, setT0, setTol, error }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition}
      className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-cyan-300 mb-3">Seleccionar valor inicial</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <label className="text-sm text-slate-400">T₀ (°C)
          <input type="text" inputMode="decimal" value={T0} onChange={(e) => setT0(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">Tolerancia εa (%)
          <input type="text" inputMode="decimal" value={tol} onChange={(e) => setTol(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
      </div>
      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      <p className="text-slate-500 text-xs mt-3">Al cambiar T₀ o la tolerancia, la tabla, el gráfico y la interpretación se recalculan al instante.</p>
    </motion.div>
  )
}

function ContextSolution({ T0 }) {
  const gp = gPrime(T0)
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Dato</h3><p>T = g(T) = 18 + 8·e^(−0.15T), forma iterativa directa de f(T) = T − 18 − 8e^(−0.15T) = 0.</p></div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Condición de convergencia</h3>
        <p>g'(T) = −1.2·e^(−0.15T). En T₀={T0}: g'({T0}) = {gp.toFixed(4)} → |g'|={Math.abs(gp).toFixed(4)} {Math.abs(gp) < 1 ? '< 1 → converge' : '≥ 1 → NO converge, prueba otro T₀'}.</p>
      </div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Aproximación inicial</h3><p>Se parte de T₀={T0} (temperatura ambiente razonable de arranque).</p></div>
    </>
  )
}

function GraphSolution({ raiz }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Qué muestra</h3><p>Convergencia del error relativo εa (%) en cada iteración; al decrecer hacia 0 confirma que la sucesión converge al punto fijo.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Lectura</h3><p>{raiz ? `Converge a T ≈ ${raiz.gTn.toFixed(4)} °C.` : 'No converge con estos valores.'}</p></div>
    </>
  )
}

function TableSolution({ rows }) {
  if (!rows.length) return <p>Sin iteraciones válidas.</p>
  return (
    <>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula</h3>
        <p className="bg-white/5 rounded-lg p-3 inline-block">T_(n+1) = g(T_n) = 18 + 8·e^(−0.15·T_n)　　εa = |T_(n+1) − T_n| / T_(n+1) × 100</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.iter} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-cyan-300 font-semibold mb-1">Iteración {r.iter}</p>
            <p>T_n = {r.Tn.toFixed(6)}</p>
            <p>g(T_n) = T_(n+1) = {r.gTn.toFixed(6)}</p>
            <p>f(T_n) = {r.fTn.toFixed(6)}</p>
            <p>εa = {r.error === null ? '—' : r.error.toFixed(6) + '%'}</p>
            <p className={`font-semibold mt-1 ${r.cumple === 'sí' ? 'text-emerald-400' : 'text-slate-500'}`}>¿εa &lt; tol? → {r.cumple}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function InterpretationSolution({ raiz, rows }) {
  if (!raiz) return <p>Ajusta T₀ para lograr convergencia (|g'(T)| &lt; 1).</p>
  return (
    <>
      <p>Tras {rows.length - 1} iteraciones, T ≈ {raiz.gTn.toFixed(4)} °C, εa = {raiz.error?.toFixed(6)}%.</p>
      <p>Esa es la temperatura de equilibrio del centro de datos: el punto donde el calor generado por la carga computacional se compensa exactamente con la capacidad de refrigeración. El sistema de climatización debe diseñarse para sostener esa temperatura.</p>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Verificación</h3>
        <p>Se sustituye T≈{raiz.gTn.toFixed(4)} en la función original f(T) = T − 18 − 8e^(−0.15T):</p>
        <p>f({raiz.gTn.toFixed(4)}) = {f(raiz.gTn).toFixed(6)} ≈ 0 → confirma que es raíz.</p>
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

export default function Problema1_PuntoFijo() {
  const [T0Str, setT0Str] = useState('20')
  const [tolStr, setTolStr] = useState('0.01')
  const T0 = T0Str === '' ? NaN : Number(T0Str)
  const tol = tolStr === '' ? NaN : Number(tolStr)

  const inputError = (T0Str === '' || tolStr === '') ? 'Completa T₀ y la tolerancia.'
    : Number.isNaN(T0) || Number.isNaN(tol) ? 'Valores inválidos.'
    : Math.abs(gPrime(T0)) >= 1 ? `|g'(T₀)|=${Math.abs(gPrime(T0)).toFixed(3)} ≥ 1: no converge. Prueba T₀ entre 0 y 40.`
    : null

  const rows = useMemo(() => (inputError ? [] : puntoFijo(T0, tol, 50)), [T0, tol, inputError])
  const raiz = rows.length ? rows[rows.length - 1] : null
  const chartData = rows.map(r => ({ iter: r.iter, error: r.error === null ? 0 : r.error }))

  const [openSection, setOpenSection] = useState(null)
  const modalConfig = {
    context: { title: 'Solución — Contexto y convergencia', wide: false, content: <ContextSolution T0={Number.isNaN(T0) ? 20 : T0} /> },
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
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Problema 1 — Método del Punto Fijo</h1>
        <p className="text-slate-400 mt-2">Control de temperatura en un centro de datos</p>

        <ValuesPanel T0={T0Str} tol={tolStr} setT0={setT0Str} setTol={setTolStr} error={inputError} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <p className="text-slate-300">T = g(T) = 18 + 8·e^(−0.15T)</p>
            <SolutionButton onClick={() => setOpenSection('context')} />
          </div>
          <p className="text-sm text-slate-500 mt-2">{Number.isNaN(T0) ? 'Completa T₀.' : `T₀ = ${T0} — g'(T₀) = ${gPrime(T0).toFixed(4)}`}</p>
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
            <thead><tr className="text-slate-400 border-b border-white/10">{['Iter.', 'T_n', 'g(T_n)', 'f(T_n)', 'εa (%)', 'Cumple'].map(h => <th className="text-left py-2 px-2" key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence>
                {rows.map((r) => (
                  <motion.tr key={r.iter} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5">
                    <td className="py-1.5 px-2">{r.iter}</td>
                    <td className="py-1.5 px-2">{r.Tn.toFixed(6)}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{r.gTn.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fTn.toFixed(6)}</td>
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
            <p className="text-slate-300">Tras {rows.length - 1} iteraciones, T ≈ <span className="font-bold text-emerald-300">{raiz.gTn.toFixed(4)} °C</span>, εa = {raiz.error?.toFixed(6)}%. Esa es la temperatura de equilibrio del sistema de refrigeración.</p>
          ) : <p className="text-rose-400">{inputError}</p>}
        </motion.div>
      </motion.div>

      <SolutionModal open={!!active} onClose={() => setOpenSection(null)} title={active?.title} wide={active?.wide}>{active?.content}</SolutionModal>
    </div>
  )
}
