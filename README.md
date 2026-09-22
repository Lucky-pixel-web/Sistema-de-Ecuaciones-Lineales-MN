# Métodos Numéricos — Panel unificado de ejercicios

Aplicación React (Vite + Tailwind v4 + Framer Motion + Recharts) que reúne, en una sola interfaz
con navegación lateral tipo panel administrativo, los 6 ejercicios desarrollados en el curso:

- **Métodos de Intervalo Cerrado** — Bisección (Problema 1) y Falsa Posición (Problema 2)
- **Métodos Abiertos** — Punto Fijo, Newton-Raphson y Secante
- **Raíces de Polinomios** — Criterio de Descartes, Cota de Lagrange y Método de Müller
  aplicados al análisis de estabilidad de un filtro digital IIR:
  `D(z) = 8z⁴ − 6z³ − 3z² + 3z − 1 = 0`

## Qué cambió respecto a las dos apps anteriores

- Se reemplazó la barra de pestañas superior por una **barra lateral con módulos colapsables**,
  un panel de inicio con tarjetas resumen, breadcrumb y transiciones animadas al cambiar de
  ejercicio (inspirado en paneles administrativos tipo dashboard).
- Cada ejercicio conserva su gráfico, tabla de iteraciones y panel de "intercambiar valores":
  todo se **recalcula en vivo** con las fórmulas reales (no hay resultados fijos escritos a mano).
- Se agregó el ejercicio nuevo de la Sesión 4 (Müller), con aritmética compleja propia
  (para que el método pueda "saltar" al plano complejo igual que en la guía teórica),
  deflación polinomial automática y verificación de estabilidad del filtro.

## Cómo ejecutar

```bash
npm install
npm run dev       # entorno de desarrollo
npm run build     # genera dist/ para producción
```

Requiere Node 18+. Si `npm install` falla por el bug conocido de dependencias opcionales de
rolldown/vite, borra `node_modules` y `package-lock.json` y vuelve a instalar.
