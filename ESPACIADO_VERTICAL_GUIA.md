# Guía de Espaciado Vertical - SunTzu Front

Esta guía te muestra exactamente qué valores cambiar para ajustar el espaciado vertical de los componentes en la página principal.

## 📍 Ubicaciones de Archivos y Clases Clave

### 1. **src/app/page.tsx** (Líneas 296-298)
Controla el espacio ENTRE secciones principales:

```tsx
<div className="mt-6"><QuestionMarquee onQuestionClick={handleSearch} /></div>
<TopicSelector onSelect={(topic) => handleSearch(topic, true)} className="mt-3" />
<div className="w-full mt-5"><SearchInput onSearch={handleSearch} /></div>
```

**Valores a ajustar:**
- `mt-6` → Espacio entre el texto de bienvenida y las tarjetas en movimiento
- `mt-3` → Espacio entre las tarjetas en movimiento y los botones de tópicos
- `mt-5` → Espacio entre los botones de tópicos y la caja del chat

**Ejemplo de ajuste:**
- Para más espacio: `mt-6` → `mt-8` o `mt-10` o `mt-12`
- Para menos espacio: `mt-6` → `mt-4` o `mt-3` o `mt-2`

---

### 2. **src/components/search-hero.tsx** (Línea 3)
Controla el padding INTERNO del logo + texto de bienvenida:

```tsx
<div className="flex flex-col items-center justify-center w-full max-w-3xl mx-auto py-3 md:pb-2 md:pt-4 space-y-2 text-center animate-in fade-in slide-in-from-bottom-4 duration-700">
```

**Valores a ajustar:**
- `py-3` → Padding vertical general (mobile)
- `md:pb-2` → Padding bottom en desktop
- `md:pt-4` → Padding top en desktop
- `space-y-2` → Espacio entre el logo y el texto de bienvenida

**Ejemplo:**
- Más aire: `py-3` → `py-6`, `space-y-2` → `space-y-4`
- Menos aire: `py-3` → `py-2`, `space-y-2` → `space-y-1`

---

### 3. **src/components/question-marquee.tsx** (Línea 22)
Controla el padding INTERNO del contenedor de tarjetas en movimiento:

```tsx
<div className="w-full overflow-hidden space-y-3 py-6 pointer-events-none select-none relative z-0">
```

**Valores a ajustar:**
- `py-6` → Padding vertical del contenedor de tarjetas
- `space-y-3` → Espacio vertical entre la fila 1 y fila 2 de tarjetas

**Ejemplo:**
- Más aire: `py-6` → `py-8`, `space-y-3` → `space-y-4`
- Menos aire: `py-6` → `py-4`, `space-y-3` → `space-y-2`

---

### 4. **src/components/topic-selector.tsx** (Línea 26)
Controla el tamaño de los botones de tópicos:

```tsx
className={cn(
    "px-3 py-1.5 border rounded-full text-xs transition-all shadow-sm",
```

**Valores a ajustar:**
- `px-3` → Padding horizontal de los botones
- `py-1.5` → Padding vertical de los botones (ALTURA)
- `text-xs` → Tamaño de fuente

**Ejemplo:**
- Botones más grandes: `py-1.5` → `py-2` o `py-3`, `text-xs` → `text-sm`
- Botones más pequeños: `py-1.5` → `py-1`, mantener `text-xs`

---

### 5. **src/components/question-marquee.tsx** (Líneas 33 y 51)
Controla el tamaño de las tarjetas en movimiento:

```tsx
className="flex items-center px-4 py-1.5 bg-gray-50 rounded-2xl border border-gray-100 shadow-sm text-gray-600 whitespace-nowrap text-xs cursor-pointer hover:bg-white hover:shadow-md hover:text-black transition-all pointer-events-auto active:scale-95"
```

**Valores a ajustar:**
- `px-4` → Padding horizontal de cada tarjeta
- `py-1.5` → Padding vertical de cada tarjeta (ALTURA)
- `text-xs` → Tamaño de fuente

**Ejemplo:**
- Tarjetas más grandes: `py-1.5` → `py-2`, `text-xs` → `text-sm`
- Tarjetas más pequeñas: mantener como está

---

## 🎯 Estrategia Recomendada

Para aprovechar mejor el espacio vertical sin que se vea todo junto:

### Opción A: Aumentar espacios entre secciones
```
src/app/page.tsx (líneas 296-298):
- mt-6 → mt-8 o mt-10
- mt-3 → mt-5 o mt-6
- mt-5 → mt-7 o mt-8
```

### Opción B: Mantener componentes pequeños pero más separados
```
1. src/components/search-hero.tsx: Mantener py-3 y space-y-2
2. src/components/question-marquee.tsx: Mantener py-6 y space-y-3
3. src/app/page.tsx: Aumentar mt-6 → mt-10, mt-3 → mt-6, mt-5 → mt-8
```

### Opción C: Aumentar padding interno de componentes
```
1. src/components/search-hero.tsx: py-3 → py-5, space-y-2 → space-y-3
2. src/components/question-marquee.tsx: py-6 → py-8, space-y-3 → space-y-4
3. src/app/page.tsx: Mantener mt-6, mt-3, mt-5
```

---

## 🔢 Referencia de Valores Tailwind

- `mt-1` = 0.25rem = 4px
- `mt-2` = 0.5rem = 8px
- `mt-3` = 0.75rem = 12px
- `mt-4` = 1rem = 16px
- `mt-5` = 1.25rem = 20px
- `mt-6` = 1.5rem = 24px
- `mt-8` = 2rem = 32px
- `mt-10` = 2.5rem = 40px
- `mt-12` = 3rem = 48px

Lo mismo aplica para `py-X`, `space-y-X`, etc.

---

## 💡 Consejos

1. **Empieza ajustando src/app/page.tsx** - Los valores `mt-X` son los más fáciles de modificar
2. **Prueba incrementos de 2 en 2** - Por ejemplo: mt-6 → mt-8 → mt-10
3. **Mantén la proporción** - Si aumentas un espacio, considera aumentar los otros proporcionalmente
4. **Guarda y recarga** - Los cambios se ven inmediatamente con hot-reload

---

## 🚀 Workflow Rápido

1. Abre `src/app/page.tsx`
2. Modifica las líneas 296-298 con nuevos valores de `mt-X`
3. Guarda el archivo
4. Mira el resultado en el navegador
5. Ajusta hasta que te guste
6. Haz commit de los cambios
