import { useState, useMemo } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts'
import upeuLogo from './assets/upeu-logo.png'

/* ============ Aritmética compleja mínima ============ */
const C = (re, im = 0) => ({ re, im })
const cadd = (a, b) => C(a.re + b.re, a.im + b.im)
const csub = (a, b) => C(a.re - b.re, a.im - b.im)
const cmul = (a, b) => C(a.re * b.re - a.im * b.im, a.re * b.im + a.im * b.re)
const cdiv = (a, b) => {
  const d = b.re * b.re + b.im * b.im
  return C((a.re * b.re + a.im * b.im) / d, (a.im * b.re - a.re * b.im) / d)
}
const cabs = (a) => Math.sqrt(a.re * a.re + a.im * a.im)
const cscale = (a, k) => C(a.re * k, a.im * k)
function csqrt(a) {
  const r = cabs(a)
  const re = Math.sqrt(Math.max(0, (r + a.re) / 2))
  const im = Math.sign(a.im || 1) * Math.sqrt(Math.max(0, (r - a.re) / 2))
  return C(re, im)
}
function cfmt(z, dp = 4) {
  if (Math.abs(z.im) < 1e-9) return z.re.toFixed(dp)
  const sign = z.im >= 0 ? '+' : '−'
  return `${z.re.toFixed(dp)} ${sign} ${Math.abs(z.im).toFixed(dp)}i`
}

/* Evalúa un polinomio (coeficientes reales o complejos, grado mayor primero) en z, por Horner */
function polyEval(coeffs, z) {
  let r = C(0, 0)
  for (const c of coeffs) {
    const cc = typeof c === 'number' ? C(c, 0) : c
    r = cadd(cmul(r, z), cc)
  }
  return r
}

/* Deflación: divide coeffs entre (x - root), devuelve el cociente (grado n-1) */
function deflate(coeffs, root) {
  const out = [typeof coeffs[0] === 'number' ? C(coeffs[0], 0) : coeffs[0]]
  for (let i = 1; i < coeffs.length - 1; i++) {
    const ci = typeof coeffs[i] === 'number' ? C(coeffs[i], 0) : coeffs[i]
    out.push(cadd(ci, cmul(out[out.length - 1], root)))
  }
  const last = typeof coeffs[coeffs.length - 1] === 'number' ? C(coeffs[coeffs.length - 1], 0) : coeffs[coeffs.length - 1]
  const remainder = cadd(last, cmul(out[out.length - 1], root))
  return { quotient: out, remainder }
}

/* Método de Müller — sigue el algoritmo de la Guía Teórica al pie de la letra.
   Reproduce la misma disposición que la hoja de cálculo del profesor:
   por cada iteración se guardan AMBOS candidatos (xi+3(+) y xi+3(-)) y el
   error relativo porcentual entre la raíz elegida actual y la anterior. */
function muller(coeffs, x0, x1, x2, tol, maxIter) {
  const rows = []
  let z0 = x0, z1 = x1, z2 = x2
  let prevRoot = null
  for (let i = 0; i < maxIter; i++) {
    const f0 = polyEval(coeffs, z0), f1 = polyEval(coeffs, z1), f2 = polyEval(coeffs, z2)
    const h0 = csub(z1, z0), h1 = csub(z2, z1)
    const d0 = cdiv(csub(f1, f0), h0), d1 = cdiv(csub(f2, f1), h1)
    const a = cdiv(csub(d1, d0), cadd(h1, h0))
    const b = cadd(cmul(a, h1), d1)
    const c = f2
    const disc = csqrt(csub(cmul(b, b), cscale(cmul(a, c), 4)))
    const denomPlus = cadd(b, disc), denomMinus = csub(b, disc)
    const zPlus = csub(z2, cdiv(cscale(c, 2), denomPlus))
    const zMinus = csub(z2, cdiv(cscale(c, 2), denomMinus))
    const chosen = cabs(denomPlus) > cabs(denomMinus) ? zPlus : zMinus
    const errPct = prevRoot === null ? null : (cabs(csub(chosen, prevRoot)) / cabs(chosen)) * 100
    const converge = errPct !== null && errPct < tol
    rows.push({ iter: i, z0, z1, z2, f0, f1, f2, h0, h1, d0, d1, a, b, c, disc, denomPlus, denomMinus, zPlus, zMinus, chosen, errPct, converge })
    z0 = z1; z1 = z2; z2 = chosen
    prevRoot = chosen
    if (converge) break
  }
  return { rows, root: z2 }
}

function fmtErr(v) {
  if (v === null) return '—'
  if (Math.abs(v) < 0.001 && v !== 0) return v.toExponential(2)
  return v.toFixed(4)
}

const cardTransition = { type: 'spring', stiffness: 300, damping: 20 }

function SolutionButton({ onClick, label = 'Ver solución' }) {
  return (
    <button onClick={onClick} className="text-xs px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 border border-amber-500/30 hover:bg-amber-500/30 whitespace-nowrap ml-3 shrink-0">
      {label}
    </button>
  )
}

function SolutionModal({ open, onClose, title, wide, children }) {
  if (!open) return null
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm" onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} onClick={(e) => e.stopPropagation()}
        className={`${wide ? 'max-w-6xl' : 'max-w-2xl'} w-full max-h-[88vh] overflow-y-auto bg-slate-950 border border-amber-500/30 rounded-2xl p-8 shadow-[0_0_80px_rgba(251,191,36,0.2)]`}>
        <div className="flex justify-between items-center mb-6 sticky -top-8 bg-slate-950/95 backdrop-blur pt-2 pb-3 -mt-2 z-10">
          <h2 className="text-2xl font-bold text-amber-300">{title}</h2>
          <button onClick={onClose} className="text-slate-400 hover:text-white text-xl">✕</button>
        </div>
        <div className="space-y-4 text-slate-300 text-sm leading-relaxed">{children}</div>
      </motion.div>
    </div>
  )
}

/* ---------- panel de valores iniciales (z0, z1, z2, tolerancia) ---------- */
function ValuesPanel({ z0, z1, z2, tol, setZ0, setZ1, setZ2, setTol, error }) {
  const clean = (v) => v.replace(/[^0-9.\-]/g, '')
  return (
    <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition}
      className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
      <h2 className="text-lg font-semibold text-amber-300 mb-3">Intercambiar valores iniciales</h2>
      <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
        <label className="text-sm text-slate-400">z0
          <input type="text" inputMode="decimal" value={z0} onChange={(e) => setZ0(clean(e.target.value))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-400" />
        </label>
        <label className="text-sm text-slate-400">z1
          <input type="text" inputMode="decimal" value={z1} onChange={(e) => setZ1(clean(e.target.value))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-400" />
        </label>
        <label className="text-sm text-slate-400">z2
          <input type="text" inputMode="decimal" value={z2} onChange={(e) => setZ2(clean(e.target.value))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-400" />
        </label>
        <label className="text-sm text-slate-400">Tolerancia ε (%)
          <input type="text" inputMode="decimal" value={tol} onChange={(e) => setTol(clean(e.target.value))}
            className="mt-1 w-full bg-black/40 border border-white/10 rounded-lg px-3 py-2 text-amber-300 focus:outline-none focus:border-amber-400" />
        </label>
      </div>
      {error && <p className="text-rose-400 text-sm mt-3">{error}</p>}
      <p className="text-slate-500 text-xs mt-3">Al cambiar estos valores, la tabla de iteraciones, la deflación y las raíces finales se recalculan automáticamente — todo resultado mostrado es una aproximación numérica.</p>
    </motion.div>
  )
}

/* ---------- contenidos de los modales de solución ---------- */
function DescartesSolution() {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Regla de los signos de Descartes</h3>
        <p>El número de raíces reales positivas es igual al número de variaciones de signo en D(z), o menor en una cantidad par. Para raíces negativas se aplica el mismo conteo sobre D(−z).</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">D(z) = 8z⁴ − 6z³ − 3z² + 3z − 1</h3>
        <p>Signos: +, −, −, +, − → variaciones: (+→−), (−→+), (+→−) = 3 variaciones.</p>
        <p>Raíces positivas posibles: 3 ó 1.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">D(−z) = 8z⁴ + 6z³ − 3z² − 3z − 1</h3>
        <p>Signos: +, +, −, −, − → variaciones: (+→−) = 1 variación.</p>
        <p>Raíces negativas posibles: exactamente 1.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Lectura combinada</h3>
        <p>Grado 4, con exactamente 1 raíz negativa garantizada. Si hay 3 positivas se agotan las 4 raíces reales; si hay 1 positiva, sobran 2 raíces complejas conjugadas. Ambos escenarios son consistentes con la regla — Müller confirmará cuál ocurre.</p></div>
    </>
  )
}

function LagrangeSolution({ B }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Cota superior estándar de Lagrange</h3>
        <p>B = 1 + ᵏ√(K/aₙ), con aₙ &gt; 0 el coeficiente principal, K el mayor valor absoluto entre los coeficientes negativos, y k la posición del primer coeficiente negativo contando desde aₙ₋₁.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Aplicación a D(z)</h3>
        <p>aₙ = 8. El primer coeficiente negativo tras a₄ es a₃ = −6, así que k = 1. El mayor valor absoluto entre los negativos (−6, −3, −1) es K = 6.</p>
        <p>B = 1 + (6/8)^(1/1) = 1 + 0.75 = {B.toFixed(4)}</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Conclusión</h3>
        <p>Toda raíz z de D(z) cumple |z| ≤ {B.toFixed(4)}. Esto acota la región de búsqueda antes de iterar con Müller.</p></div>
    </>
  )
}

function MullerSolution({ rows, root, coeffs }) {
  const r1 = rows[0]
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Idea del método</h3>
        <p>Müller ajusta una parábola por los tres últimos puntos (z0, z1, z2) y avanza hacia la raíz de esa parábola más cercana a z2. Cada iteración produce <span className="text-amber-300">dos</span> candidatos — xi+3(+) y xi+3(−) — según el signo elegido en el denominador; se conserva el que tenga mayor magnitud de denominador, porque así se evita la cancelación sustractiva.</p></div>

      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Cómo se obtiene, paso a paso, la Iteración 1</h3>
        <p>Partiendo de z0={cfmt(r1.z0)}, z1={cfmt(r1.z1)}, z2={cfmt(r1.z2)}, se evalúa D(z) en los tres puntos:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <p className="bg-white/5 rounded-lg p-3">f0 = D(z0) = {cfmt(r1.f0)}</p>
          <p className="bg-white/5 rounded-lg p-3">f1 = D(z1) = {cfmt(r1.f1)}</p>
          <p className="bg-white/5 rounded-lg p-3">f2 = D(z2) = {cfmt(r1.f2)}</p>
        </div>
        <p className="mt-3">Diferencias finitas y pendientes:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <p className="bg-white/5 rounded-lg p-3">h₀ = z1−z0 = {cfmt(r1.h0)} &nbsp; h₁ = z2−z1 = {cfmt(r1.h1)}</p>
          <p className="bg-white/5 rounded-lg p-3">δ₀ = (f1−f0)/h₀ = {cfmt(r1.d0)} &nbsp; δ₁ = (f2−f1)/h₁ = {cfmt(r1.d1)}</p>
        </div>
        <p className="mt-3">Coeficientes de la parábola P(z) = a(z−z2)² + b(z−z2) + c:</p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mt-2">
          <p className="bg-white/5 rounded-lg p-3">a = (δ₁−δ₀)/(h₁+h₀) = {cfmt(r1.a)}</p>
          <p className="bg-white/5 rounded-lg p-3">b = a·h₁+δ₁ = {cfmt(r1.b)}</p>
          <p className="bg-white/5 rounded-lg p-3">c = f2 = {cfmt(r1.c)}</p>
        </div>
        <p className="mt-3">Discriminante y los dos candidatos:</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-2">
          <p className="bg-white/5 rounded-lg p-3">√(b²−4ac) = {cfmt(r1.disc)}</p>
          <p className="bg-white/5 rounded-lg p-3">|b+√Δ| = {cabs(r1.denomPlus).toFixed(4)} &nbsp; |b−√Δ| = {cabs(r1.denomMinus).toFixed(4)}</p>
          <p className="bg-white/5 rounded-lg p-3">xi+3(+) = z2 − 2c/(b+√Δ) = <span className="text-amber-300">{cfmt(r1.zPlus, 5)}</span></p>
          <p className="bg-white/5 rounded-lg p-3">xi+3(−) = z2 − 2c/(b−√Δ) = <span className="text-amber-300">{cfmt(r1.zMinus, 5)}</span></p>
        </div>
        <p className="mt-3">Como |b+√Δ| {cabs(r1.denomPlus) > cabs(r1.denomMinus) ? '>' : '<'} |b−√Δ|, se elige {cabs(r1.denomPlus) > cabs(r1.denomMinus) ? 'xi+3(+)' : 'xi+3(−)'} = <span className="text-amber-300 font-bold">{cfmt(r1.chosen, 5)}</span> como la Iteración 1 de la tabla. El proceso se repite desplazando la ventana (z1,z2,z3) hasta que el error relativo entre raíces consecutivas cae por debajo de la tolerancia.</p>
      </div>

      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Fórmula del error</h3>
        <p className="bg-white/5 rounded-lg p-3">Error (%) = |raíz actual − raíz anterior| / |raíz actual| × 100</p>
        <p className="text-sm text-slate-400 mt-1">La primera iteración no tiene "raíz anterior", por eso su error se muestra como "—", igual que en la hoja de cálculo de referencia.</p>
      </div>

      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Resultado</h3>
        <p>Con {rows.length} iteraciones se alcanza z₁ ≈ {cfmt(root, 6)} (|z₁| = {cabs(root).toFixed(6)}), con error final {rows[rows.length - 1]?.errPct !== null ? fmtErr(rows[rows.length - 1].errPct) + '%' : '—'}.</p>
        {Math.abs(root.im) > 1e-6 && <p className="text-amber-300">El algoritmo se desplazó al plano complejo por sí solo — sin ninguna instrucción especial — porque el discriminante de la parábola resultó negativo.</p>}
      </div>
    </>
  )
}

function DeflationSolution({ cubic, root2, quad, r3, r4 }) {
  return (
    <>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Teorema del factor</h3>
        <p>Si z₁ es raíz de D(z), entonces D(z) = (z − z₁)·Q(z), con Q(z) de grado 3. Dividir por división sintética compleja reduce el problema (deflación).</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Cúbico resultante Q(z)</h3>
        <p>Q(z) = {cubic.map((c, i) => `${i === 0 ? '' : ' + '}(${cfmt(c, 4)})·z^${cubic.length - 1 - i}`).join('')}</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Segunda raíz vía Müller</h3>
        <p>Aplicando Müller de nuevo sobre Q(z) se obtiene z₂ ≈ {cfmt(root2, 6)}.</p></div>
      <div><h3 className="text-fuchsia-400 font-semibold mb-1">Cuadrático final y fórmula general</h3>
        <p>Tras deflactar una vez más queda un binomio cuadrático que se resuelve de forma exacta con la fórmula general, entregando el par conjugado z₃ ≈ {cfmt(r3, 6)} y z₄ ≈ {cfmt(r4, 6)}.</p></div>
    </>
  )
}

function InterpretationSolution({ allRoots, stable, B }) {
  return (
    <>
      <p>Las cuatro raíces de D(z) tienen módulo: {allRoots.map(r => cabs(r).toFixed(4)).join(', ')} — todas {stable ? 'menores' : 'no todas menores'} que 1, y todas dentro de la cota de Lagrange B = {B.toFixed(4)}.</p>
      <p>Como el criterio de estabilidad exige |z| &lt; 1 para todas las raíces del denominador, el filtro IIR resulta <span className={stable ? 'text-emerald-300 font-bold' : 'text-rose-300 font-bold'}>{stable ? 'ESTABLE' : 'INESTABLE'}</span>.</p>
    </>
  )
}

function SpinningLogo() {
  return (
    <motion.div animate={{ rotate: 360 }} transition={{ duration: 8, repeat: Infinity, ease: 'linear' }}
      className="hidden">
      <img src={upeuLogo} alt="UPeU" className="w-full h-full object-cover" />
    </motion.div>
  )
}

export default function Muller_Problema() {
  const [z0Str, setZ0Str] = useState('0')
  const [z1Str, setZ1Str] = useState('0.5')
  const [z2Str, setZ2Str] = useState('1.0')
  const [tolStr, setTolStr] = useState('0.001')

  const z0v = Number(z0Str), z1v = Number(z1Str), z2v = Number(z2Str), tol = Number(tolStr)
  const inputError = [z0Str, z1Str, z2Str, tolStr].some(s => s === '') ? 'Completa los cuatro valores.'
    : [z0v, z1v, z2v, tol].some(Number.isNaN) ? 'Valores inválidos.'
    : (z0v === z1v || z1v === z2v || z0v === z2v) ? 'z0, z1 y z2 deben ser distintos.'
    : tol <= 0 ? 'La tolerancia debe ser positiva.' : null

  // D(z) = 8z^4 - 6z^3 - 3z^2 + 3z - 1
  const coeffs = [8, -6, -3, 3, -1]
  const B = useMemo(() => {
    const an = coeffs[0]
    const negIdx = coeffs.findIndex((c, i) => i > 0 && c < 0)
    const k = negIdx // posición desde a_{n-1}
    const K = Math.max(...coeffs.slice(1).filter(c => c < 0).map(c => Math.abs(c)))
    return 1 + Math.pow(K / an, 1 / k)
  }, [])

  const { rows: mullerRows, root: root1, cubic, deflateOk } = useMemo(() => {
    if (inputError) return { rows: [], root: C(0, 0), cubic: [], deflateOk: false }
    const m = muller(coeffs, C(z0v), C(z1v), C(z2v), tol, 60)
    const { quotient } = deflate(coeffs, m.root)
    return { rows: m.rows, root: m.root, cubic: quotient, deflateOk: true }
  }, [z0v, z1v, z2v, tol, inputError])

  const { root2, rows2, quad, r3, r4, allRoots, stable } = useMemo(() => {
    if (!deflateOk) return { root2: C(0, 0), rows2: [], quad: [], r3: C(0, 0), r4: C(0, 0), allRoots: [], stable: false }
    // segunda pasada de Müller sobre el cúbico, ventana desplazada hacia la región restante
    const m2 = muller(cubic, C(-1), C(-0.5), C(0), tol, 80)
    const { quotient: quadC } = deflate(cubic, m2.root)
    // fórmula general (compleja) para las dos raíces finales
    const a = quadC[0], b = quadC[1], c = quadC[2]
    const disc = csqrt(csub(cmul(b, b), cscale(cmul(a, c), 4)))
    const r3v = cdiv(cadd(csub(C(0, 0), b), disc), cscale(a, 2))
    const r4v = cdiv(csub(csub(C(0, 0), b), disc), cscale(a, 2))
    const roots = [root1, m2.root, r3v, r4v]
    const stableAll = roots.every(r => cabs(r) < 1)
    return { root2: m2.root, rows2: m2.rows, quad: quadC, r3: r3v, r4: r4v, allRoots: roots, stable: stableAll }
  }, [deflateOk, cubic, root1])

  const chartData = mullerRows.filter(r => r.errPct !== null).map(r => ({ iter: r.iter, error: r.errPct }))

  const [openSection, setOpenSection] = useState(null)
  const modalConfig = {
    descartes: { title: 'Solución — Regla de Descartes', wide: false, content: <DescartesSolution /> },
    lagrange: { title: 'Solución — Cota de Lagrange', wide: false, content: <LagrangeSolution B={B} /> },
    muller: { title: 'Solución — Método de Müller (z₁)', wide: true, content: deflateOk && <MullerSolution rows={mullerRows} root={root1} coeffs={coeffs} /> },
    deflation: { title: 'Solución — Deflación y raíces restantes', wide: false, content: deflateOk && <DeflationSolution cubic={cubic} root2={root2} quad={quad} r3={r3} r4={r4} /> },
    interpretation: { title: 'Solución — Estabilidad del filtro', wide: false, content: deflateOk && <InterpretationSolution allRoots={allRoots} stable={stable} B={B} /> },
  }
  const active = openSection ? modalConfig[openSection] : null

  return (
    <div className="relative text-slate-100 p-6 md:p-10">
      <div className="absolute inset-0 overflow-hidden pointer-events-none -z-10">
        <motion.div animate={{ x: [0, 200, -50, 0], y: [0, 100, -80, 0] }} transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-0 left-1/4 w-96 h-96 bg-amber-500/30 rounded-full blur-[100px]" />
        <motion.div animate={{ x: [0, -150, 60, 0], y: [0, -100, 50, 0] }} transition={{ duration: 18, repeat: Infinity, ease: 'easeInOut' }} className="absolute bottom-0 right-1/4 w-96 h-96 bg-indigo-500/30 rounded-full blur-[100px]" />
        <motion.div animate={{ x: [0, 120, -100, 0], y: [0, 150, -60, 0] }} transition={{ duration: 20, repeat: Infinity, ease: 'easeInOut' }} className="absolute top-1/2 right-1/3 w-72 h-72 bg-rose-500/20 rounded-full blur-[100px]" />
      </div>

      <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }} className="max-w-[1400px] mx-auto relative z-10">
        <h1 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-amber-400 to-rose-400 bg-clip-text text-transparent">Raíces de Polinomios — Método de Müller</h1>
        <p className="text-slate-400 mt-2">Análisis de estabilidad de un filtro digital IIR (procesamiento de señales)</p>

        {/* Contexto */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <h2 className="text-lg font-semibold text-amber-300 mb-2">Contexto del problema</h2>
          <p className="text-slate-300 text-sm leading-relaxed">La estabilidad de un filtro IIR depende de las raíces de su polinomio característico D(z). El sistema es estable si y solo si el módulo de <span className="text-amber-300">todas</span> sus raíces cumple |z| &lt; 1 (dentro del círculo unitario del plano Z).</p>
          <p className="mt-3 text-center text-lg font-mono text-amber-200 bg-black/30 rounded-lg py-3">D(z) = 8z⁴ − 6z³ − 3z² + 3z − 1 = 0</p>
        </motion.div>

        <ValuesPanel z0={z0Str} z1={z1Str} z2={z2Str} tol={tolStr} setZ0={setZ0Str} setZ1={setZ1Str} setZ2={setZ2Str} setTol={setTolStr} error={inputError} />

        {/* Descartes */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-amber-300">1. Delimitación teórica — Criterio de Descartes</h2>
            <SolutionButton onClick={() => setOpenSection('descartes')} />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">D(z): +, −, −, +, −</p>
              <p className="text-slate-200">Variaciones de signo = <span className="text-amber-300 font-bold">3</span> → raíces positivas: 3 ó 1</p>
            </div>
            <div className="bg-black/30 rounded-xl p-4">
              <p className="text-slate-400 text-xs mb-1">D(−z): +, +, −, −, −</p>
              <p className="text-slate-200">Variaciones de signo = <span className="text-amber-300 font-bold">1</span> → raíces negativas: exactamente 1</p>
            </div>
          </div>
        </motion.div>

        {/* Lagrange */}
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
          <div className="flex justify-between items-start">
            <h2 className="text-lg font-semibold text-amber-300">2. Cota Global de Lagrange</h2>
            <SolutionButton onClick={() => setOpenSection('lagrange')} />
          </div>
          <p className="mt-3 text-slate-300">B = 1 + (K/aₙ)^(1/k) = 1 + (6/8)¹ = <span className="text-amber-300 font-bold">{B.toFixed(4)}</span></p>
          <p className="text-sm text-slate-500 mt-1">Toda raíz z de D(z) cumple |z| ≤ {B.toFixed(4)} — región válida para iniciar la búsqueda numérica.</p>
        </motion.div>

        {/* Müller — tabla de iteraciones */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6 overflow-x-auto">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold text-amber-300">3. Implementación numérica — Método de Müller (z₁)</h2>
            <SolutionButton onClick={() => setOpenSection('muller')} label="Ver solución detallada" />
          </div>
          {inputError ? <p className="text-rose-400">{inputError}</p> : (
            <>
              <table className="w-full text-sm">
                <thead><tr className="text-slate-400 border-b border-white/10">{['Iter.', 'xi', 'xi+1', 'xi+2', 'xi+3(+)', 'xi+3(−)', 'xi+3', 'Error (%)', '¿Converge?'].map(h => <th className="text-left py-2 px-2" key={h}>{h}</th>)}</tr></thead>
                <tbody>
                  <AnimatePresence>
                    {mullerRows.map(r => (
                      <motion.tr key={r.iter} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} className="border-b border-white/5">
                        <td className="py-1.5 px-2">{r.iter}</td>
                        <td className="py-1.5 px-2">{cfmt(r.z0)}</td>
                        <td className="py-1.5 px-2">{cfmt(r.z1)}</td>
                        <td className="py-1.5 px-2">{cfmt(r.z2)}</td>
                        <td className="py-1.5 px-2">{cfmt(r.zPlus)}</td>
                        <td className="py-1.5 px-2">{cfmt(r.zMinus)}</td>
                        <td className="py-1.5 px-2 text-amber-300 font-semibold">{cfmt(r.chosen)}</td>
                        <td className="py-1.5 px-2">{fmtErr(r.errPct)}</td>
                        <td className={`py-1.5 px-2 font-semibold ${r.converge ? 'text-emerald-400' : 'text-slate-500'}`}>{r.converge ? 'sí' : 'no'}</td>
                      </motion.tr>
                    ))}
                  </AnimatePresence>
                </tbody>
              </table>
              <div className="mt-4 h-56">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={chartData} margin={{ top: 10, right: 20, bottom: 0, left: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                    <XAxis dataKey="iter" stroke="#94a3b8" tick={{ fontSize: 11 }} />
                    <YAxis stroke="#94a3b8" tick={{ fontSize: 11 }} scale="log" domain={['auto', 'auto']} />
                    <Tooltip contentStyle={{ background: '#1e293b', border: '1px solid #334155', borderRadius: 8 }} />
                    <Line type="monotone" dataKey="error" stroke="#fbbf24" strokeWidth={3} dot={{ r: 3 }} style={{ filter: 'drop-shadow(0 0 6px #fbbf24)' }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
              <p className="text-slate-400 text-sm mt-3">z₁ ≈ <span className="text-amber-300 font-bold">{cfmt(root1, 6)}</span> tras {mullerRows.length} iteraciones (ε = {tolStr}%).</p>
            </>
          )}
        </motion.div>

        {/* Deflación y raíces restantes */}
        {!inputError && deflateOk && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={cardTransition} className="mt-6 backdrop-blur-md bg-white/5 border border-white/10 rounded-2xl p-6">
            <div className="flex justify-between items-start">
              <h2 className="text-lg font-semibold text-amber-300">4. Análisis de ingeniería — Deflación y raíces restantes</h2>
              <SolutionButton onClick={() => setOpenSection('deflation')} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mt-4">
              {allRoots.map((r, i) => (
                <div key={i} className="bg-black/30 rounded-xl p-4">
                  <p className="text-slate-400 text-xs mb-1">z{i + 1}</p>
                  <p className="text-amber-200 font-mono">{cfmt(r, 5)}</p>
                  <p className={`text-sm mt-1 font-semibold ${cabs(r) < 1 ? 'text-emerald-400' : 'text-rose-400'}`}>|z{i + 1}| = {cabs(r).toFixed(5)}</p>
                </div>
              ))}
            </div>
          </motion.div>
        )}

        {/* Interpretación / estabilidad */}
        {!inputError && deflateOk && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
            className={`mt-6 mb-10 backdrop-blur-md border rounded-2xl p-6 ${stable ? 'bg-gradient-to-r from-emerald-500/10 to-cyan-500/10 border-emerald-400/20' : 'bg-gradient-to-r from-rose-500/10 to-amber-500/10 border-rose-400/20'}`}>
            <div className="flex justify-between items-start mb-2">
              <h2 className={`text-lg font-semibold ${stable ? 'text-emerald-300' : 'text-rose-300'}`}>Conclusión — Estabilidad del filtro</h2>
              <SolutionButton onClick={() => setOpenSection('interpretation')} />
            </div>
            <p className="text-slate-300">Todas las raíces caen dentro de la cota de Lagrange (B = {B.toFixed(4)}). El módulo máximo encontrado es {Math.max(...allRoots.map(r => cabs(r))).toFixed(5)}.</p>
            <p className="mt-2 text-xl font-bold">{stable ? <span className="text-emerald-300">✓ El filtro es ESTABLE</span> : <span className="text-rose-300">✗ El filtro es INESTABLE</span>}</p>
          </motion.div>
        )}
      </motion.div>

      <SolutionModal open={!!active} onClose={() => setOpenSection(null)} title={active?.title} wide={active?.wide}>{active?.content}</SolutionModal>
      <SpinningLogo />
    </div>
  )
}
