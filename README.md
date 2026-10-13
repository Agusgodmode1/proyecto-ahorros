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

- **Importar mis datos**: si usabas la página anterior (`proyecto-ahorros.html`), abrila, tocá **Copiar mis datos (respaldo)** abajo de todo, volvé a la app y pegalo. También podés elegir un archivo de respaldo que hayas exportado. Antes de cargar te muestra un resumen ("12 gastos, 10 registros de horas, 3 fijos…") y te pide que confirmes.
- **Empezar con datos de ejemplo**: tu sueldo, tus horas de octubre y un plan de $ 40.000. Los cambiás cuando quieras.

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

Están en un solo lugar: `FERIADOS` en `js/logica/fechas.js`. Para sumar uno, agregá la fecha (`'2027-05-01'`) a la lista.

### Pruebas

Hace falta [Node.js](https://nodejs.org) (versión LTS). Desde esta carpeta:

```bash
node --test
```

Prueban la liquidación contra tus recibos reales, el plan, el respaldo, el service worker y la voz.

### Probarla en la compu

Los módulos de JavaScript no funcionan abriendo `index.html` con doble clic: necesitan un servidor. Con Node instalado:

```bash
npx serve .
```

y abrí la dirección que muestra. (O pedíselo a Claude Code.)
