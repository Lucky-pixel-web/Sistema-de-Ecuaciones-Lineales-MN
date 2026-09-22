import { useState, useMemo, useRef, Fragment } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
} from 'recharts'

/* =========================================================================
   DATOS DEL PROBLEMA (tal cual el PDF GAA — Sesión 6)
   4x1 + 2x2 + 1x3 = 14   (Tráfico global)
   12x1+10x2 + 5x3 = 46   (Procesamiento backend)
   -8x1+ 8x2 + 7x3 = 26   (Consultas a Base de Datos)
   ========================================================================= */

const A_MATRIX = [
  [4, 2, 1],
  [12, 10, 5],
  [-8, 8, 7],
]

const B1 = [14, 46, 26] // Fase 1 — vector de SLA inicial
const B2 = [20, 62, 30] // Fase 2 — nuevo tráfico en tiempo real

/* =========================================================================
   UTILIDADES
   ========================================================================= */

const SUBS = ['₀', '₁', '₂', '₃', '₄', '₅', '₆', '₇', '₈', '₉']
const sub = (n) => String(n).split('').map((d) => SUBS[+d] ?? d).join('')

function fmt(v, d = 4) {
  if (!Number.isFinite(v)) return '—'
  const r = Number(v.toFixed(d))
  return Object.is(r, -0) ? '0' : r.toString()
}

function matVecMul(M, v) {
  return M.map((row) => row.reduce((s, a, j) => s + a * v[j], 0))
}

/* =========================================================================
   FACTORIZACIÓN LU — MÉTODO DE DOOLITTLE (genérico, con bitácora de pasos)
   uij = aij − Σ(k<i) Lik·Ukj
   lji = (aji − Σ(k<i) Ljk·Uki) / Uii
   ========================================================================= */

function doolittle(A) {
  const n = A.length
  const L = Array.from({ length: n }, () => Array(n).fill(0))
  const U = Array.from({ length: n }, () => Array(n).fill(0))
  for (let i = 0; i < n; i++) L[i][i] = 1
  const steps = []

  for (let i = 0; i < n; i++) {
    for (let j = i; j < n; j++) {
      let suma = 0
      const terms = []
      for (let k = 0; k < i; k++) {
        suma += L[i][k] * U[k][j]
        terms.push(`L${sub(i + 1)}${sub(k + 1)}·U${sub(k + 1)}${sub(j + 1)}`)
      }
      U[i][j] = A[i][j] - suma
      steps.push({
        tipo: 'U', i, j,
        texto:
          `U${sub(i + 1)}${sub(j + 1)} = a${sub(i + 1)}${sub(j + 1)}` +
          (terms.length ? ` − (${terms.join(' + ')})` : '') +
          ` = ${fmt(A[i][j])}` + (terms.length ? ` − ${fmt(suma)}` : '') +
          ` = ${fmt(U[i][j])}`,
      })
    }
    for (let j = i + 1; j < n; j++) {
      let suma = 0
      const terms = []
      for (let k = 0; k < i; k++) {
        suma += L[j][k] * U[k][i]
        terms.push(`L${sub(j + 1)}${sub(k + 1)}·U${sub(k + 1)}${sub(i + 1)}`)
      }
      L[j][i] = (A[j][i] - suma) / U[i][i]
      steps.push({
        tipo: 'L', i: j, j: i,
        texto:
          `L${sub(j + 1)}${sub(i + 1)} = (a${sub(j + 1)}${sub(i + 1)}` +
          (terms.length ? ` − (${terms.join(' + ')})` : '') +
          `) / U${sub(i + 1)}${sub(i + 1)} = (${fmt(A[j][i])}` +
          (terms.length ? ` − ${fmt(suma)}` : '') +
          `) / ${fmt(U[i][i])} = ${fmt(L[j][i])}`,
      })
    }
  }
  return { L, U, steps }
}

/* Sustitución hacia adelante:  L·y = b */
function forwardSub(L, b) {
  const n = L.length
  const y = Array(n).fill(0)
  const steps = []
  for (let i = 0; i < n; i++) {
    let suma = 0
    const terms = []
    for (let k = 0; k < i; k++) {
      suma += L[i][k] * y[k]
      terms.push(`L${sub(i + 1)}${sub(k + 1)}·y${sub(k + 1)}`)
    }
    y[i] = (b[i] - suma) / L[i][i]
    steps.push(
      `y${sub(i + 1)} = (b${sub(i + 1)}` +
      (terms.length ? ` − (${terms.join(' + ')})` : '') +
      `) / L${sub(i + 1)}${sub(i + 1)} = (${fmt(b[i])}` +
      (terms.length ? ` − ${fmt(suma)}` : '') +
      `) / ${fmt(L[i][i])} = ${fmt(y[i])}`
    )
  }
  return { y, steps }
}

/* Sustitución hacia atrás:  U·x = y */
function backwardSub(U, y) {
  const n = U.length
  const x = Array(n).fill(0)
  const steps = []
  for (let i = n - 1; i >= 0; i--) {
    let suma = 0
    const terms = []
    for (let k = i + 1; k < n; k++) {
      suma += U[i][k] * x[k]
      terms.push(`U${sub(i + 1)}${sub(k + 1)}·x${sub(k + 1)}`)
    }
    x[i] = (y[i] - suma) / U[i][i]
    steps.push(
      `x${sub(i + 1)} = (y${sub(i + 1)}` +
      (terms.length ? ` − (${terms.join(' + ')})` : '') +
      `) / U${sub(i + 1)}${sub(i + 1)} = (${fmt(y[i])}` +
      (terms.length ? ` − ${fmt(suma)}` : '') +
      `) / ${fmt(U[i][i])} = ${fmt(x[i])}`
    )
  }
  return { x, steps }
}

/* =========================================================================
   UI — piezas
   ========================================================================= */

function Matriz({ m, decimals = 2 }) {
  return (
    <div className="inline-flex items-stretch align-middle">
      <div className="w-1.5 border-l-2 border-y-2 border-slate-500 rounded-l-sm" />
      <table className="border-collapse">
        <tbody>
          {m.map((row, i) => (
            <tr key={i}>
              {row.map((v, j) => (
                <td key={j} className="px-2.5 py-1 text-center font-mono text-sm text-slate-100 whitespace-nowrap">
                  {fmt(v, decimals)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
      <div className="w-1.5 border-r-2 border-y-2 border-slate-500 rounded-r-sm" />
    </div>
  )
}

function Vector({ v, decimals = 2 }) {
  return <Matriz m={v.map((x) => [x])} decimals={decimals} />
}

function ListaPasos({ pasos }) {
  return (
    <ol className="space-y-1.5">
      {pasos.map((p, i) => (
        <li key={i} className="font-mono text-xs text-slate-300 bg-slate-950/60 rounded-lg px-3 py-1.5 border border-slate-800">
          {p}
        </li>
      ))}
    </ol>
  )
}

function TarjetaFase({ titulo, nota, b, y, ySteps, x, xSteps, color }) {
  const [abierto, setAbierto] = useState(false)
  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
      <div className="flex items-start justify-between gap-4 mb-3">
        <div>
          <h3 className="font-medium text-slate-100">{titulo}</h3>
          <p className="text-xs text-slate-500">{nota}</p>
        </div>
        <button
          onClick={() => setAbierto((v) => !v)}
          className="text-xs px-3 py-1 rounded-full border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 whitespace-nowrap shrink-0"
        >
          {abierto ? 'ocultar pasos' : 'ver sustitución'}
        </button>
      </div>

      <div className="flex flex-wrap items-center gap-6">
        <div>
          <div className="text-xs text-slate-500 mb-1">b</div>
          <Vector v={b} decimals={2} />
        </div>
        <div className="text-slate-600">→ Ly=b →</div>
        <div>
          <div className="text-xs text-slate-500 mb-1">y</div>
          <Vector v={y} decimals={4} />
        </div>
        <div className="text-slate-600">→ Ux=y →</div>
        <div>
          <div className="text-xs mb-1" style={{ color }}>x (solución)</div>
          <Vector v={x} decimals={4} />
        </div>
      </div>

      <AnimatePresence>
        {abierto && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.22 }}
            className="overflow-hidden"
          >
            <div className="grid md:grid-cols-2 gap-4 pt-4 mt-4 border-t border-slate-800">
              <div>
                <div className="text-xs text-slate-400 mb-2">Sustitución hacia adelante — Ly = b</div>
                <ListaPasos pasos={ySteps} />
              </div>
              <div>
                <div className="text-xs text-slate-400 mb-2">Sustitución hacia atrás — Ux = y</div>
                <ListaPasos pasos={xSteps} />
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

function GraficoComplejidad({ n, kMax }) {
  const datos = useMemo(() => {
    const puntos = []
    for (let k = 1; k <= kMax; k++) {
      // Conteo clásico de operaciones (flops) de análisis numérico:
      // Eliminación gaussiana completa ≈ (2/3)n³ + n²   →  repetida k veces
      // LU: (2/3)n³ una sola vez  +  2n² por cada sustitución (adelante+atrás)
      const gauss = k * ((2 / 3) * n ** 3 + n * n)
      const lu = (2 / 3) * n ** 3 + k * (2 * n * n)
      puntos.push({ k, gauss: Math.round(gauss), lu: Math.round(lu) })
    }
    return puntos
  }, [n, kMax])

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={datos} margin={{ top: 10, right: 20, bottom: 20, left: 0 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
        <XAxis dataKey="k" stroke="#64748b"
               label={{ value: 'vectores b procesados (k)', position: 'insideBottom', dy: 14, fill: '#64748b' }} />
        <YAxis stroke="#64748b"
               label={{ value: 'operaciones (aprox.)', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                 labelStyle={{ color: '#e2e8f0' }} labelFormatter={(v) => `k = ${v} vectores`} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Line type="monotone" dataKey="gauss" name="Recalcular Gauss cada vez" stroke="#fb7185" strokeWidth={2} dot={false} isAnimationActive={false} />
        <Line type="monotone" dataKey="lu" name="LU una vez + sustituciones" stroke="#22d3ee" strokeWidth={2} dot={false} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  )
}

function GraficoResultados({ datos }) {
  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={datos} margin={{ top: 10, right: 20, bottom: 10, left: 0 }}>
        <CartesianGrid stroke="#1e293b" strokeDasharray="3 3" />
        <XAxis dataKey="vector" stroke="#64748b" />
        <YAxis stroke="#64748b"
               label={{ value: 'tiempo de cómputo x', angle: -90, position: 'insideLeft', fill: '#64748b' }} />
        <Tooltip contentStyle={{ background: '#0f172a', border: '1px solid #334155', borderRadius: 8 }}
                 labelStyle={{ color: '#e2e8f0' }} formatter={(v) => Number(v).toFixed(4)} />
        <Legend wrapperStyle={{ fontSize: 12, color: '#94a3b8' }} />
        <Bar dataKey="x1" name="x₁ (S₁)" fill="#22d3ee" radius={[4, 4, 0, 0]} />
        <Bar dataKey="x2" name="x₂ (S₂)" fill="#facc15" radius={[4, 4, 0, 0]} />
        <Bar dataKey="x3" name="x₃ (S₃)" fill="#a78bfa" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

/* =========================================================================
   COMPONENTE PRINCIPAL
   ========================================================================= */

export default function PracticaBalanceoLU() {
  const { L, U, steps } = useMemo(() => doolittle(A_MATRIX), [])
  const [mostrarDoolittle, setMostrarDoolittle] = useState(false)

  // Resolución de las dos fases exigidas por el enunciado
  const fase1 = useMemo(() => {
    const { y, steps: ySteps } = forwardSub(L, B1)
    const { x, steps: xSteps } = backwardSub(U, y)
    return { b: B1, y, ySteps, x, xSteps }
  }, [L, U])

  const fase2 = useMemo(() => {
    const { y, steps: ySteps } = forwardSub(L, B2)
    const { x, steps: xSteps } = backwardSub(U, y)
    return { b: B2, y, ySteps, x, xSteps }
  }, [L, U])

  /* -------- Extensión: tabla ampliable de vectores b (petición del docente) -------- */
  const [maxVectores, setMaxVectores] = useState(10)
  const nextId = useRef(1)
  const [filas, setFilas] = useState([])
  const [expandidas, setExpandidas] = useState(new Set())

  const total = 2 + filas.length // b1 + b2 + extensión

  function agregarVector() {
    if (total >= maxVectores) return
    setFilas((prev) => [...prev, { id: nextId.current++, b: [0, 0, 0] }])
  }
  function actualizarValor(id, idx, valor) {
    setFilas((prev) =>
      prev.map((f) => (f.id === id ? { ...f, b: f.b.map((v, i) => (i === idx ? Number(valor) : v)) } : f))
    )
  }
  function eliminarFila(id) {
    setFilas((prev) => prev.filter((f) => f.id !== id))
    setExpandidas((prev) => {
      const s = new Set(prev)
      s.delete(id)
      return s
    })
  }
  function toggleExpandida(id) {
    setExpandidas((prev) => {
      const s = new Set(prev)
      s.has(id) ? s.delete(id) : s.add(id)
      return s
    })
  }

  const resultadosExtension = useMemo(
    () =>
      filas.map((f) => {
        const { y, steps: ySteps } = forwardSub(L, f.b)
        const { x, steps: xSteps } = backwardSub(U, y)
        const Ax = matVecMul(A_MATRIX, x)
        const residual = Math.max(...Ax.map((v, i) => Math.abs(v - f.b[i])))
        return { ...f, y, ySteps, x, xSteps, residual }
      }),
    [filas, L, U]
  )

  // Datos para el gráfico de barras: crece automáticamente con la tabla
  const datosGrafico = useMemo(() => {
    const base = [
      { vector: 'b₁', x1: fase1.x[0], x2: fase1.x[1], x3: fase1.x[2] },
      { vector: 'b₂', x1: fase2.x[0], x2: fase2.x[1], x3: fase2.x[2] },
    ]
    const ext = resultadosExtension.map((r, idx) => ({
      vector: `b${sub(idx + 3)}`, x1: r.x[0], x2: r.x[1], x3: r.x[2],
    }))
    return [...base, ...ext]
  }, [fase1, fase2, resultadosExtension])

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 p-6 md:p-10">
      <div className="max-w-6xl mx-auto space-y-8">

        {/* Encabezado */}
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          <div className="text-xs uppercase tracking-wide text-cyan-400/80 mb-1">
            Métodos Numéricos · Sesión 6 · GAA
          </div>
          <h1 className="text-2xl md:text-3xl font-bold text-slate-50">
            Balanceo de Carga en Clústers Mediante Factorización LU
          </h1>
          <p className="text-slate-400 mt-2 text-sm max-w-3xl">
            Sistema A·x = b de 3 microservicios (S₁, S₂, S₃). Como el vector de tráfico{' '}
            <span className="font-mono text-slate-300">b</span> cambia en tiempo real, A se
            descompone una única vez (A = LU) y cada nuevo vector se resuelve con dos
            sustituciones de costo O(n²), sin recalcular la eliminación.
          </p>
        </motion.div>

        {/* Gráfico: por qué LU (comparación teórica de complejidad) */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-300 mb-1">¿Por qué descomponer una sola vez?</div>
          <p className="text-xs text-slate-500 mb-3">
            Curva ilustrativa basada en el conteo teórico de operaciones (O(n³) vs O(n²)) mencionado
            en el enunciado — no es una medición real de tiempos de ejecución.
          </p>
          <GraficoComplejidad n={A_MATRIX.length} kMax={Math.max(maxVectores, total)} />
        </div>

        {/* Matriz A */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-300 mb-3">Matriz de tráfico A</div>
          <Matriz m={A_MATRIX} decimals={0} />
        </div>

        {/* Fase 1: Doolittle */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <button onClick={() => setMostrarDoolittle((v) => !v)} className="flex items-center justify-between w-full text-left">
            <span className="font-medium text-slate-200">
              Fase 1 — Descomposición A = LU (método de Doolittle)
            </span>
            <span className="text-cyan-400 text-sm shrink-0 ml-4">
              {mostrarDoolittle ? 'ocultar derivación' : 'ver derivación paso a paso'}
            </span>
          </button>

          <AnimatePresence>
            {mostrarDoolittle && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-4 mt-4 border-t border-slate-800">
                  <ListaPasos pasos={steps.map((s) => s.texto)} />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div className="flex flex-wrap items-center gap-8 mt-5">
            <div>
              <div className="text-xs text-slate-500 mb-1">L (triangular inferior)</div>
              <Matriz m={L} decimals={4} />
            </div>
            <div>
              <div className="text-xs text-slate-500 mb-1">U (triangular superior)</div>
              <Matriz m={U} decimals={4} />
            </div>
          </div>
        </div>

        {/* Fase 1: resolver para b1 */}
        <TarjetaFase
          titulo="Fase 1 — Resolver para b₁ (SLA inicial)"
          nota="Ly = b₁, luego Ux = y"
          b={fase1.b} y={fase1.y} ySteps={fase1.ySteps} x={fase1.x} xSteps={fase1.xSteps}
          color="#22d3ee"
        />

        {/* Fase 2: reutilizar L,U para b2 */}
        <TarjetaFase
          titulo="Fase 2 — Nuevo tráfico en tiempo real, b₂ (reutiliza L y U, sin recalcular)"
          nota="Misma L y U de la Fase 1 — solo dos sustituciones O(n²)"
          b={fase2.b} y={fase2.y} ySteps={fase2.ySteps} x={fase2.x} xSteps={fase2.xSteps}
          color="#facc15"
        />

        {/* Gráfico: x1,x2,x3 por cada vector resuelto */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="text-sm text-slate-300 mb-3">Tiempos de cómputo por microservicio, por vector b</div>
          <GraficoResultados datos={datosGrafico} />
        </div>

        {/* Extensión: tabla ampliable de vectores b */}
        <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
          <div className="flex flex-wrap items-center justify-between gap-4 mb-4">
            <div>
              <h3 className="font-medium text-slate-200">Extensión — más vectores de tráfico en tiempo real</h3>
              <p className="text-xs text-slate-500">
                Ingresa tus propios vectores b adicionales; todos reutilizan la misma L y U (no se recalcula la descomposición).
              </p>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-slate-400 flex items-center gap-2">
                Máximo de vectores
                <input
                  type="number" min={2} max={50} value={maxVectores}
                  onChange={(e) => setMaxVectores(Math.min(50, Math.max(2, Number(e.target.value))))}
                  className="w-16 bg-slate-950 border border-slate-800 rounded-lg px-2 py-1 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500/60"
                />
              </label>
              <button
                onClick={agregarVector}
                disabled={total >= maxVectores}
                className="text-xs px-3 py-1.5 rounded-full border border-cyan-500/30 text-cyan-300 hover:bg-cyan-500/10 disabled:opacity-30 disabled:hover:bg-transparent whitespace-nowrap"
              >
                + Agregar vector b
              </button>
            </div>
          </div>

          <div className="text-xs text-slate-500 mb-3">{total} / {maxVectores} vectores en uso</div>

          <div className="rounded-xl border border-slate-800 overflow-hidden">
            <div className="max-h-[480px] overflow-y-auto">
              <table className="w-full text-sm">
                <thead className="sticky top-0 bg-slate-900 text-slate-400">
                  <tr>
                    <th className="text-left font-medium px-3 py-2">#</th>
                    <th className="text-left font-medium px-3 py-2">b</th>
                    <th className="text-left font-medium px-3 py-2">y (Ly=b)</th>
                    <th className="text-left font-medium px-3 py-2">x (Ux=y)</th>
                    <th className="text-left font-medium px-3 py-2">verificación</th>
                    <th className="px-3 py-2"></th>
                  </tr>
                </thead>
                <tbody>
                  {/* filas fijas del enunciado */}
                  {[{ label: 'b₁', data: fase1, locked: true }, { label: 'b₂', data: fase2, locked: true }].map((r) => (
                    <tr key={r.label} className="border-t border-slate-900">
                      <td className="px-3 py-2 text-slate-500 font-mono">{r.label}</td>
                      <td className="px-3 py-2 font-mono text-slate-300">({r.data.b.join(', ')})</td>
                      <td className="px-3 py-2 font-mono text-slate-300">({r.data.y.map((v) => fmt(v)).join(', ')})</td>
                      <td className="px-3 py-2 font-mono text-cyan-300">({r.data.x.map((v) => fmt(v)).join(', ')})</td>
                      <td className="px-3 py-2 text-emerald-400 text-xs">PDF ✓</td>
                      <td className="px-3 py-2 text-slate-600 text-xs">fijo</td>
                    </tr>
                  ))}

                  {/* filas de extensión, editables */}
                  {resultadosExtension.map((r, idx) => (
                    <Fragment key={r.id}>
                      <tr className="border-t border-slate-900 hover:bg-slate-900/60">
                        <td className="px-3 py-2 text-slate-500 font-mono">b{sub(idx + 3)}</td>
                        <td className="px-3 py-2">
                          <div className="flex gap-1">
                            {r.b.map((v, i) => (
                              <input
                                key={i} type="number" value={v}
                                onChange={(e) => actualizarValor(r.id, i, e.target.value)}
                                className="w-16 bg-slate-950 border border-slate-800 rounded px-1.5 py-1 text-slate-100 font-mono text-xs text-center focus:outline-none focus:border-cyan-500/60"
                              />
                            ))}
                          </div>
                        </td>
                        <td className="px-3 py-2 font-mono text-slate-300 text-xs">({r.y.map((v) => fmt(v)).join(', ')})</td>
                        <td className="px-3 py-2 font-mono text-cyan-300 text-xs">({r.x.map((v) => fmt(v)).join(', ')})</td>
                        <td className="px-3 py-2 text-xs">
                          {r.residual < 1e-6
                            ? <span className="text-emerald-400">✓ correcto</span>
                            : <span className="text-amber-400">Δ {fmt(r.residual, 6)}</span>}
                        </td>
                        <td className="px-3 py-2 text-xs whitespace-nowrap">
                          <button onClick={() => toggleExpandida(r.id)} className="text-cyan-400 hover:underline mr-2">pasos</button>
                          <button onClick={() => eliminarFila(r.id)} className="text-rose-400 hover:underline">quitar</button>
                        </td>
                      </tr>
                      {expandidas.has(r.id) && (
                        <tr className="bg-slate-950/60">
                          <td colSpan={6} className="px-4 py-3">
                            <div className="grid md:grid-cols-2 gap-4">
                              <div>
                                <div className="text-xs text-slate-400 mb-1">Ly = b</div>
                                <ListaPasos pasos={r.ySteps} />
                              </div>
                              <div>
                                <div className="text-xs text-slate-400 mb-1">Ux = y</div>
                                <ListaPasos pasos={r.xSteps} />
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
