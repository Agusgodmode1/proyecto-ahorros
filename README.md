# Proyecto Ahorros

Tu plan hasta el próximo sueldo, como app en el iPhone: cuánto guardar, cuánto podés gastar por día, cuánto vas a cobrar con las horas extra, tus gastos fijos, el extracto del BROU y tus logros. También podés cargar gastos y horas hablando.

- **Funciona sin internet.**
- **Tus datos quedan solo en el teléfono.** No se suben a GitHub ni a ningún servidor. Para no perderlos, exportá un respaldo de vez en cuando (ver más abajo).
- Es una página web común (HTML, CSS y JavaScript). GitHub Pages la publica gratis.

---

## 1. Publicarla en internet (una sola vez)

Necesitás una dirección web para abrirla desde el iPhone. GitHub Pages te la da gratis.

### 1.1. Crear la cuenta y el repositorio

1. Entrá a <https://github.com> y creá una cuenta (botón **Sign up**). Anotá tu nombre de usuario; acá lo llamamos `TU-USUARIO`.
2. Arriba a la derecha tocá **+** → **New repository**.
3. En **Repository name** poné `proyecto-ahorros`.
4. Elegí **Public**. Con la cuenta gratis, GitHub Pages solo funciona con repositorios públicos. No pasa nada: el repositorio tiene el código de la app, **no tus datos**. (Si pagás GitHub Pro, podés elegir **Private**.)
5. **No** marques "Add a README". Tocá **Create repository**.

### 1.2. Subir la carpeta

En la compu, abrí una terminal en esta carpeta (o pedile a Claude Code que lo haga por vos) y ejecutá estos dos comandos, cambiando `TU-USUARIO` por tu usuario:

```bash
git remote add origin https://github.com/TU-USUARIO/proyecto-ahorros.git
```

```bash
git push -u origin main
```

La primera vez se abre una ventana para iniciar sesión en GitHub. Iniciá sesión y aceptá.

### 1.3. Activar GitHub Pages

1. En la página del repositorio entrá a **Settings** (Configuración) → **Pages** (en el menú de la izquierda).
2. En **Build and deployment** → **Source** elegí **Deploy from a branch**.
3. En **Branch** elegí **main** y la carpeta **/ (root)**. Tocá **Save**.
4. Esperá uno o dos minutos y recargá esa página. Arriba aparece la dirección de tu app:
   `https://TU-USUARIO.github.io/proyecto-ahorros/`

---

## 2. Instalarla en el iPhone

1. Abrí **Safari** en el iPhone y entrá a `https://TU-USUARIO.github.io/proyecto-ahorros/`.
2. Tocá el botón **Compartir** (el cuadrado con la flecha para arriba).
3. Bajá y tocá **Agregar a pantalla de inicio**. El nombre ya dice "Ahorros". Tocá **Agregar**.
4. Desde ahora abrila **siempre con el ícono** (el sol amarillo sobre fondo celeste). Así abre a pantalla completa, sin la barra de Safari, y funciona sin internet.

### La primera vez

La app te pregunta:

- **Empezar: crear mi perfil**: tu nombre, tu sueldo, qué día cobrás, tus reglas de horas extra y tus descuentos. Así la puede usar cualquier persona con sus propios números.
- **Importar mis datos**: si usabas la página anterior (`proyecto-ahorros.html`), abrila, tocá **Copiar mis datos (respaldo)** abajo de todo, volvé a la app y pegalo. También podés elegir un archivo de respaldo que hayas exportado. Antes de cargar te muestra un resumen ("12 gastos, 10 registros de horas, 3 fijos…") y te pide que confirmes.
- **Solo mirar, con datos de ejemplo**: datos de muestra, marcados como ejemplo. Cuando quieras los borrás y creás tu perfil.

El perfil se cambia después en **Ajustes → Mi perfil**.

### Lo de todos los días

- Arriba de **Plan** ves **cuánto podés gastar hoy**: lo que le queda a la semana repartido en los días que faltan. Si te pasás, se pone en rojo.
- Ahí mismo tocá **Anotar un gasto de hoy**. La categoría se elige sola según lo que escribas (si la cambiás, la app aprende).
- En **Semanas** podés **editar** cualquier gasto, y si borrás uno aparece **Deshacer** unos segundos.
- Los tres pasos del plan quedan plegados en **Ajustar mi plan**.

### Más cosas

- **Modo discreto**: el ojo al lado del engranaje tapa todos los montos ($ •••). Útil para abrir la app en el trabajo o en el ómnibus. Se recuerda en ese teléfono.
- **Con un toque**: arriba del formulario aparecen tus gastos más repetidos de los últimos 60 días ("Boleto $ 50"). Un toque y queda anotado, con "Deshacer".
- **Dólares**: cargá la cotización en **Ajustes → Dólar**. Después, al anotar un gasto o un fijo, tocá el **$** al lado del monto para pasarlo a **US$**. Cada gasto guarda la cotización de ese día; los fijos en dólares siguen la cotización nueva. Por voz: "gasté 12 dólares en Spotify".
- **Metas con nombre** (pestaña Logros): "Viaje a Brasil · $ 60.000 · para marzo". Te dice cuánto falta, cuánto por mes necesitás y cuándo llegás a tu ritmo. Al cerrar el mes repartís lo que guardaste entre tus metas. Cada meta cumplida es un logro.
- **Aguinaldo y licencia** (pestaña Sueldo): el aguinaldo que viene, en mano, con el detalle mes a mes; y el salario vacacional según los días que te tomes. Si el aguinaldo cae en tu próximo mes, se suma en "Cuando cobres".
- **Gastos a Excel** (Ajustes): una planilla de los gastos del período o de todos, para abrir en Excel o Numbers.

### Cargar por voz

Tocá el **micrófono** azul (abajo a la derecha) y decí, por ejemplo:

| Decís | Qué hace |
|---|---|
| "gasté 850 en el súper" | anota un gasto de hoy en Supermercado |
| "ayer 450 de pedidos ya" | gasto de ayer en Delivery y comida |
| "dos lucas en el kiosco" | gasto de $ 2.000 |
| "hice 20 minutos extra hoy" | suma horas extra de entre semana |
| "trabajé el sábado 6 horas y media" | suma 6 h 30 de fin de semana |
| "agregá un fijo de alquiler de 15 mil el día 1" | crea un gasto fijo |
| "pagué el alquiler" | marca ese fijo como pagado |
| "cuánto me queda esta semana" | te contesta en pantalla y en voz, sin guardar nada |

**Siempre** aparece una tarjeta para revisar y corregir antes de guardar. Si cambiás la categoría, la app lo aprende para la próxima.

En la app instalada, iOS a veces no deja usar el reconocimiento de voz de la página. En ese caso se abre un cuadro de texto: **tocá el micrófono del teclado y dictá**. El resto es igual. Si el teclado no muestra el micrófono, activalo en el iPhone en **Ajustes › General › Teclado › Activar dictado**.

---

## 3. Hacer cambios y actualizar el teléfono

1. En la compu, pedile a Claude Code el cambio que quieras.
2. Cuando esté listo, subilo:

   ```bash
   git push
   ```

   (Si Claude Code no hizo el commit, pedile "hacé commit y push".)
3. Esperá uno o dos minutos a que GitHub publique.
4. En el iPhone, abrí la app. Arriba aparece **"Hay una versión nueva · Actualizar"**. Tocá **Actualizar**.
   - Si no aparece, cerrá la app del todo (deslizá hacia arriba en el selector de apps) y volvé a abrirla.

**Tus datos no se pierden al actualizar**: viven en el teléfono, no en el código.

---

## 4. Respaldo de tus datos

En la app, tocá el **engranaje** (arriba, al lado de "Hola, Agus") → **Ajustes y respaldo**:

- **Exportar mis datos**: abre el menú Compartir del iPhone. Elegí **Guardar en Archivos** (por ejemplo en iCloud Drive). Se guarda un archivo `proyecto-ahorros-AAAA-MM-DD.json`.
- **Importar un respaldo**: elegí ese archivo, o pegá el texto. Antes de reemplazar te muestra qué tiene y te pide confirmación.
- Si pasan más de 14 días sin exportar, la app te lo recuerda en la pestaña Plan.

Además, la app guarda **copias automáticas** (las 3 más nuevas): antes de cada actualización que cambie la forma de tus datos y antes de importar o reemplazar todo. Si algo sale mal, en **Ajustes → Copias automáticas** tocás **Volver a esta**.

Exportá cada tanto. Si borrás la app de la pantalla de inicio, o si cambiás de teléfono, el respaldo es la única forma de recuperar tus datos.

---

## Para Claude Code y curiosos

### Carpetas

```
index.html              la página (todas las pestañas)
manifest.webmanifest    nombre, ícono y modo pantalla completa
sw.js                   service worker: sin internet y versiones nuevas
icons/                  íconos PNG (180, 192, 512 y maskable)
css/app.css             estilos (claro y oscuro)
js/app.js               arranque, pestañas, guardado
js/estado.js            IndexedDB, migraciones, respaldo
js/pwa.js               aviso de versión nueva
js/version.js           número de versión (igual al de sw.js)
js/logica/              cálculos puros, sin pantalla (sueldo, plan, extracto, logros, voz, fechas)
js/ui/                  una vista por pestaña + voz + respaldo
tests/                  pruebas (node --test)
```

### Feriados

Los de Uruguay 2026 y 2027 están en `js/logica/feriados.js`. Desde la app, en **Ajustes → Feriados**, podés sacar los que tu trabajo no toma y agregar otros. Para sumar un año nuevo, agregá sus fechas a `feriados.js`.

### Pruebas

Hace falta [Node.js](https://nodejs.org) (versión LTS). Desde esta carpeta:

```bash
node --test
```

Prueban la liquidación (con sueldos inventados y cuentas hechas a mano), el plan, el respaldo, el service worker y la voz.

### Probarla en la compu

Los módulos de JavaScript no funcionan abriendo `index.html` con doble clic: necesitan un servidor. Con Node instalado:

```bash
npx serve .
```

y abrí la dirección que muestra. (O pedíselo a Claude Code.)
