import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ReferenceLine, ResponsiveContainer } from 'recharts'
import upeuLogo from './assets/upeu-logo.png'

function f(C) {
  return 1 / (C - 8.5) - 0.35 * Math.log(C - 2)
}

function biseccion(a, b, tol, maxIter) {
  const rows = []
  let xrAnterior = null
  for (let i = 1; i <= maxIter; i++) {
    const fa = f(a)
    const xr = (a + b) / 2
    const fxr = f(xr)
    const producto = fa * fxr
    const error = xrAnterior === null ? null : Math.abs((xr - xrAnterior) / xr) * 100
    const solucion = error !== null && error < tol ? 'sí' : (error !== null ? 'no' : '—')
    rows.push({ iter: i, a, b, xr, fxr, fa, producto, error, solucion })
    if (error !== null && error < tol) break
    if (producto < 0) {
      b = xr
    } else {
      a = xr
    }
    xrAnterior = xr
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

/* ---------- panel para intercambiar valores a, b, tolerancia ---------- */
function ValuesPanel({ a, b, tol, setA, setB, setTol, error }) {
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition}
      className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-cyan-300 mb-3">Intercambiar valores</h2>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <label className="text-sm text-slate-400">a (&gt; 8.5)
          <input type="text" inputMode="decimal" value={a} onChange={(e) => setA(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">b
          <input type="text" inputMode="decimal" value={b} onChange={(e) => setB(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
        <label className="text-sm text-slate-400">Tolerancia (%)
          <input type="text" inputMode="decimal" value={tol} onChange={(e) => setTol(e.target.value.replace(/[^0-9.\-]/g, ''))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-cyan-300 focus:outline-none focus:border-cyan-400" />
        </label>
      </div>
      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      <p className="text-slate-500 text-xs mt-3">Al cambiar estos valores, el gráfico, la tabla y la interpretación se recalculan automáticamente.</p>
    </motion.div>
  )
}

function ContextSolution({ a, b }) {
  const fa = f(a), fb = f(b)
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Dato</h3><p>f(C) = 1/(C − 8.5) − 0.35·ln(C − 2) = 0, con C &gt; 8.5</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Paso 1 — Intervalo [a, b]</h3><p>a = {a}, b = {b}</p></div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Paso 2 — Evaluación de signos</h3>
        <p>f({a}) = {fa.toFixed(4)} → {fa >= 0 ? 'positivo' : 'negativo'}</p>
        <p>f({b}) = {fb.toFixed(4)} → {fb >= 0 ? 'positivo' : 'negativo'}</p>
      </div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Paso 3 — Teorema de Bolzano</h3>
        <p>f({a})·f({b}) = {(fa * fb).toFixed(4)} {fa * fb < 0 ? '(negativo → hay raíz en el intervalo)' : '(positivo → este intervalo NO garantiza raíz, prueba otros valores)'}</p>
      </div>
    </>
  )
}

function GraphSolution({ raiz, a, b }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Cómo se construyó</h3><p>Se evaluó f(C) en pasos pequeños dentro de [{a}, {b}] (con margen) y se graficaron los pares (C, f(C)).</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Lectura</h3><p>{raiz ? `La raíz visual está en C ≈ ${raiz.xr.toFixed(4)}.` : 'No converge con estos valores: revisa que f(a) y f(b) tengan signos opuestos.'}</p></div>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Verificación en GeoGebra</h3>
        <p className="text-cyan-300 pl-4">f(x) = Función(1/(x - 8.5) - 0.35*ln(x - 2), {a}, {b})</p>
      </div>
    </>
  )
}

function TableSolution({ rows }) {
  if (!rows.length) return <p>No hay iteraciones válidas con estos valores.</p>
  return (
    <>
      <div>
        <h3 className="text-fuchsia-400 font-semibold mb-1">Fórmulas</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <p className="bg-white/5 rounded-lg p-3">xr = (a + b) / 2</p>
          <p className="bg-white/5 rounded-lg p-3">Si f(a)·f(xr) &lt; 0 → b = xr; si &gt; 0 → a = xr</p>
          <p className="bg-white/5 rounded-lg p-3">εa = |xr_nuevo − xr_anterior| / xr_nuevo × 100</p>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {rows.map((r) => (
          <div key={r.iter} className="bg-white/5 border border-white/10 rounded-xl p-4">
            <p className="text-cyan-300 font-semibold mb-1">Iteración {r.iter}</p>
            <p>xr = ({r.a.toFixed(4)}+{r.b.toFixed(4)})/2 = {r.xr.toFixed(4)}</p>
            <p>f(xr) = {r.fxr.toFixed(6)}</p>
            <p>f(a)·f(xr) = {r.producto.toFixed(6)} ({r.producto < 0 ? 'b=xr' : 'a=xr'})</p>
            <p>εa = {r.error === null ? '—' : r.error.toFixed(4) + '%'}</p>
          </div>
        ))}
      </div>
    </>
  )
}

function InterpretationSolution({ raiz, rows }) {
  if (!raiz) return <p>Ajusta a y b para que f(a)·f(b) &lt; 0 y así obtener una raíz válida.</p>
  return (
    <>
      <p>Tras {rows.length} iteraciones, C ≈ {raiz.xr.toFixed(4)} Mbps, error {raiz.error?.toFixed(4)}%.</p>
      <p>Se recomienda contratar una capacidad ligeramente por encima de este valor, redondeando hacia arriba.</p>
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

export default function Problema1() {
  const [aStr, setAStr] = useState('9')
  const [bStr, setBStr] = useState('10')
  const [tolStr, setTolStr] = useState('0.5')
  const a = aStr === '' ? NaN : Number(aStr)
  const b = bStr === '' ? NaN : Number(bStr)
  const tol = tolStr === '' ? NaN : Number(tolStr)

  const domainError = (aStr === '' || bStr === '' || tolStr === '') ? 'Completa los tres valores.'
    : Number.isNaN(a) || Number.isNaN(b) || Number.isNaN(tol) ? 'Valores inválidos.'
    : a <= 8.5 ? 'a debe ser mayor a 8.5 (dominio de f).' : (a >= b ? 'a debe ser menor que b.' : null)
  const noRootError = !domainError && f(a) * f(b) > 0
    ? 'f(a) y f(b) tienen el mismo signo: no hay garantía de raíz aquí. f(C) es decreciente y su raíz real está en C ≈ 9.9063 — prueba, por ejemplo, [9, 10] o [9, 11] (cualquier a > 8.5 con b > 9.91 funciona).'
    : null
  const inputError = domainError || noRootError

  const rows = useMemo(() => (inputError ? [] : biseccion(a, b, tol, 50)), [a, b, tol, inputError])
  const raiz = rows.length ? rows[rows.length - 1] : null

  const chartData = useMemo(() => {
    const safeA = Number.isNaN(a) ? 9 : a
    const safeB = Number.isNaN(b) ? 10 : b
    const lo = Math.max(8.51, safeA - 0.5)
    const hi = safeB + 0.5
    const data = []
    for (let i = 0; i <= 40; i++) {
      const c = lo + (i * (hi - lo)) / 40 // eslint-disable-line
      data.push({ C: Number(c.toFixed(3)), fC: Number(f(c).toFixed(4)) })
    }
    return data
  }, [a, b])

  const [openSection, setOpenSection] = useState(null)
  const modalConfig = {
    context: { title: 'Solución — Contexto y Bolzano', wide: false, content: <ContextSolution a={a} b={b} /> },
    graph: { title: 'Solución — Gráfico de f(C)', wide: false, content: <GraphSolution raiz={raiz} a={a} b={b} /> },
    table: { title: 'Solución — Tabla de iteraciones', wide: true, content: <TableSolution rows={rows} /> },
    interpretation: { title: 'Solución — Interpretación', wide: false, content: <InterpretationSolution raiz={raiz} rows={rows} /> },
  }
  const active = openSection ? modalConfig[openSection] : null

  return (
    <div className="relative text-slate-100 p-6 md:p-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div animate={{ x: [0, 200, -50, 0], y: [0, 100, -80, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-0 left-1/4 w-96 h-96 bg-green-500/40 rounded-full blur-[100px]" />
        <motion.div animate={{ x: [0, -150, 60, 0], y: [0, -100, 50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-purple-500/40 rounded-full blur-[100px]" />
        <motion.div animate={{ x: [0, 120, -100, 0], y: [0, 150, -60, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/2 right-1/3 w-72 h-72 bg-cyan-500/40 rounded-full blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1400px] mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-cyan-400 to-blue-500 bg-clip-text text-transparent">Problema 1 — Método de Bisección</h1>
        <p className="text-slate-400 mt-2">Dimensionamiento de un enlace de red bajo carga variable</p>

        <ValuesPanel a={aStr} b={bStr} tol={tolStr} setA={setAStr} setB={setBStr} setTol={setTolStr} error={inputError} />

        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <p className="text-slate-300">f(C) = 1/(C − 8.5) − 0.35·ln(C − 2) = 0, con C &gt; 8.5</p>
            <SolutionButton onClick={() => setOpenSection('context')} />
          </div>
          <p className="text-sm text-slate-500 mt-2">
            {Number.isNaN(a) || Number.isNaN(b) ? 'Completa a y b para ver la evaluación.' : `Intervalo [a, b] = [${a}, ${b}] — f(${a}) = ${f(a).toFixed(4)}, f(${b}) = ${f(b).toFixed(4)}`}
          </p>
        </motion.div>

        <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-8 shadow-[0_0_60px_rgba(56,189,248,0.15)]">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-cyan-300">Gráfico de f(C)</h2>
            <SolutionButton onClick={() => setOpenSection('graph')} />
          </div>
          <ResponsiveContainer width="100%" height={550}>
            <LineChart data={chartData} margin={{ top: 20, right: 30, bottom: 20, left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
              <XAxis dataKey="C" stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <YAxis stroke="#94a3b8" tick={{ fontSize: 12 }} />
              <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
              <ReferenceLine y={0} stroke="#f87171" strokeDasharray="4 4" />
              {raiz && <ReferenceLine x={Number(raiz.xr.toFixed(2))} stroke="#34d399" strokeDasharray="4 4" label={{ value: 'raíz', fill: '#34d399', fontSize: 12 }} />}
              <Line type="monotone" dataKey="fC" stroke="#38bdf8" strokeWidth={3.5} dot={false} style={{ filter: 'drop-shadow(0 0 6px #38bdf8)' }} />
            </LineChart>
          </ResponsiveContainer>
        </motion.div>

        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-cyan-300">Tabla de iteraciones</h2>
            <SolutionButton onClick={() => setOpenSection('table')} label="Ver solución detallada" />
          </div>
          <table className="w-full text-sm">
            <thead><tr className="text-slate-400 border-b border-white/10">{['Iter.', 'a', 'b', 'xr', 'f(xr)', 'f(a)', 'f(a)·f(xr)', 'Error (%)', 'Solución'].map(h => <th className="text-left py-2 px-2" key={h}>{h}</th>)}</tr></thead>
            <tbody>
              <AnimatePresence>
                {rows.map((r) => (
                  <motion.tr key={r.iter} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5">
                    <td className="py-1.5 px-2">{r.iter}</td>
                    <td className="py-1.5 px-2">{r.a.toFixed(4)}</td>
                    <td className="py-1.5 px-2">{r.b.toFixed(4)}</td>
                    <td className="py-1.5 px-2 text-cyan-300">{r.xr.toFixed(4)}</td>
                    <td className="py-1.5 px-2">{r.fxr.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.fa.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.producto.toFixed(6)}</td>
                    <td className="py-1.5 px-2">{r.error === null ? '—' : r.error.toFixed(4)}</td>
                    <td className={`py-1.5 px-2 font-semibold ${r.solucion === 'sí' ? 'text-emerald-400' : 'text-slate-500'}`}>{r.solucion}</td>
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
            <p className="text-slate-300">Tras {rows.length} iteraciones, C ≈ <span className="font-bold text-emerald-300">{raiz.xr.toFixed(4)} Mbps</span>, error {raiz.error?.toFixed(4)}%. Se recomienda contratar por encima de este valor.</p>
          ) : <p className="text-rose-400">{inputError}</p>}
        </motion.div>
      </motion.div>

      <SolutionModal open={!!active} onClose={() => setOpenSection(null)} title={active?.title} wide={active?.wide}>{active?.content}</SolutionModal>
    </div>
  )
}
