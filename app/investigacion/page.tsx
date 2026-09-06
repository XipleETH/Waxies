import Link from 'next/link';
import { PART_LIST, CLASSIC_SOURCE } from '@/lib/game/catalog';
import { raidPowerDescription } from '@/lib/game/raid-powers';
import { GENE_SOURCE } from '@/lib/game/genes';
export const metadata = { title: 'Investigación de partes Classic · WAXIS' };
export default function Research() {
  return (
    <main className="research-page">
      <Link href="/" className="source-link">
        ← Volver a WAXIS
      </Link>
      <p className="eyebrow">CATÁLOGO VERIFICADO · 5 SEPTIEMBRE 2026</p>
      <h1>
        De las partes del Axie
        <br />
        <span>a tu mazmorra.</span>
      </h1>
      <p className="research-lead">
        Cada defensa procede de una carta real de Axie Classic. Esta
        investigación separa los datos oficiales, las variantes visuales y las
        reglas que adaptamos al juego de plataformas.
      </p>
      <div className="research-counts">
        <div>
          <strong>192</strong>
          <span>partes estándar</span>
        </div>
        <div>
          <strong>132</strong>
          <span>cartas y defensas nivel 1</span>
        </div>
        <div>
          <strong>60</strong>
          <span>ojos y orejas sin carta</span>
        </div>
        <div>
          <strong>87</strong>
          <span>variantes visuales documentadas</span>
        </div>
      </div>
      <section>
        <h2>Qué incluye el catálogo</h2>
        <p>
          Beast, Bug, Bird, Aquatic, Plant y Reptile aportan 22 cartas cada una:
          4 bocas, 6 cuernos, 6 espaldas y 6 colas. Ojos y orejas se muestran
          como partes del Axie, pero no se les inventa un ataque. El cuerpo
          puede ser Mech, Dawn o Dusk: la carta sigue dependiendo de la clase de
          cada parte.
        </p>
        <p>
          El catálogo oficial consultado contiene 264 registros: 132 de nivel 1
          y 132 evolucionados. Esta versión juega con las 132 cartas de nivel 1,
          incluso al importar un Axie evolucionado. Las fichas muestran sus
          valores originales de ataque, escudo y energía.
        </p>
        <p>
          Hay 277 ilustraciones aisladas disponibles de las 279 piezas nombradas
          en el mapa visual consultado. Coca y Coca Shiny son variantes de
          orejas que necesitan ensamblaje adicional; figuran sin ilustración y
          no tienen carta Classic. Las variantes posteriores a ese mapa pueden
          cargar su nombre oficial y su carta base mediante los genes, mostrando
          arte base identificado como tal.
        </p>
        <a
          href="https://github.com/axieinfinity/cc-axie-gtk2d"
          target="_blank"
          rel="noreferrer"
        >
          Estructura y recursos oficiales de partes
        </a>
      </section>
      <section>
        <h2>Cómo se habilitan tus defensas</h2>
        <p>
          En Mi mazmorra, escribe el ID del Axie o su enlace de App.Axie. Leemos
          sus genes dominantes de 512 bits y su propietario directamente del
          contrato Axie en Ronin. Boca, cuerno, espalda y cola habilitan
          únicamente sus cartas base verificadas. La piel cosmética y la
          evolución se conservan como información; no crean una quinta
          habilidad.
        </p>
        <p>
          La consulta por ID utiliza ahora el contrato de Ronin. También puedes
          conectar Ronin Wallet y elegir entre sus Axies: se comprueba que el
          propietario coincida con la cuenta conectada antes de cargarlo. Se
          conserva la importación de metadatos JSON para práctica, marcada como
          procedencia no verificada.
        </p>
        <p>
          El decodificador sigue el orden ojos, boca, orejas, cuerno, espalda y
          cola. Se contrastó con el Axie #4200042 y el #27; la variante Bottom
          Dweller Shiny del #27 resuelve a Catfish / Swallow por sus genes
          Aquatic, no por parecido del nombre.
        </p>
        <p>
          Consultar un ID público identifica sus genes y propietario, pero no
          demuestra que quien lo introduce controle esa billetera. La selección
          por Ronin Wallet comprueba la cuenta compartida por la extensión y el
          propietario en la cadena; no constituye una sesión autenticada
          mediante firma y servidor. Esta versión conserva la economía de
          práctica y no conecta fondos reales. Para competir con propiedad
          acreditada faltan autenticación mediante firma y validación de
          partidas en el servidor.
        </p>
        <a href={GENE_SOURCE} target="_blank" rel="noreferrer">
          Decodificador oficial de genes
        </a>{' '}
        ·{' '}
        <a
          href="https://metadata.axieinfinity.com/axie/4200042"
          target="_blank"
          rel="noreferrer"
        >
          Metadatos oficiales de ejemplo
        </a>
      </section>
      <section>
        <h2>Tu Axie como personaje 3D</h2>
        <p>
          El personaje se ensambla en Three.js con las mallas, huesos, texturas
          y animaciones del Mixer 3D oficial. Los genes eligen el cuerpo, la
          paleta y las seis partes, incluidas evolución y variante cosmética
          cuando existen en el repositorio. La selección se aplica tanto a
          incursiones como a tu mazmorra; la práctica genera una apariencia
          aleatoria y Buba se conserva como respaldo.
        </p>
        <p>
          La conversión incluye ocho cuerpos y 575 variantes completas de
          piezas: todas las 192 partes estándar de nivel 1 y 191 de nivel 2. El
          repositorio tiene referencias incompletas para Beast Ear 06 nivel 2 y
          Bird Horn 02 Mystic nivel 2. Las variantes ausentes usan el orden de
          sustitución del Mixer y el juego muestra las piezas afectadas. No se
          incluyen los efectos de partículas adicionales de Mystic ni las
          variantes S13 ausentes del catálogo.
        </p>
        <p>
          Se utilizan animaciones oficiales de reposo, carrera y derrota;
          durante el salto se mantiene una pose de reposo mientras la física
          mueve al personaje. Los sprites pequeños del editor muestran la parte
          base. La apariencia evolucionada del personaje es independiente del
          nivel 1 de sus habilidades Classic.
        </p>
        <a
          href="https://github.com/axieinfinity/unity-axie-mixer3d"
          target="_blank"
          rel="noreferrer"
        >
          Mixer 3D oficial de Axie
        </a>{' '}
        ·{' '}
        <a
          href="https://docs.skymavis.com/api/wallet/injected-provider"
          target="_blank"
          rel="noreferrer"
        >
          Integración oficial de Ronin Wallet
        </a>
      </section>
      <section>
        <h2>Reglas de adaptación del plataformas</h2>
        <p>
          Classic es un combate por turnos; WAXIS conserva carrera automática y
          un botón de salto. Las formas de disparo, embestida, mordida, barrera,
          espinas y apoyo son adaptaciones. No presentamos sus segundos,
          trayectorias ni valores de daño como reglas de Classic.
        </p>
        <ul>
          <li>
            <strong>Pisotones:</strong> caer sobre una defensa permite rebotar y
            atacarla gastando 1 energía. Empiezas con 3 y recuperas 1 cada 3
            segundos. Sin energía sigues moviéndote y rebotando.
          </li>
          <li>
            <strong>Tipos de ataque de prueba:</strong> el pisotón rota boca,
            cuerno, espalda y cola; alterna melee/ranged para que los bloqueos y
            reflejos puedan probarse con un botón. No son cartas de Buba.
          </li>
          <li>
            <strong>Combos:</strong> otras defensas operativas del mismo diseño
            representan las cartas adicionales. Una cadena exige otra de la
            clase correspondiente; Nut Cracker, Trump, Lunge y Bug Signal
            comprueban sus familias específicas. Se permiten copias de una parte
            habilitada.
          </li>
          <li>
            <strong>Orden:</strong> la primera y última ranura equivalen a
            atacar primero o último. La ranura delantera y las adyacentes
            también determinan curaciones y escudos compartidos.
          </li>
          <li>
            <strong>Escudos y apoyo:</strong> los pisotones dañan escudos y vida
            de las defensas. Curar, limpiar y reflejar actúan sobre ese estado.
            Una defensa derrotada se apaga 6 segundos y vuelve a activarse.
          </li>
          <li>
            <strong>Energía y cartas:</strong> la energía potencia la siguiente
            ráfaga o reduce la recarga de ataques cercanos. Un apoyo sin ataque
            entrega energía a una defensa atacante. Robar carta acorta la
            siguiente recarga; descartar carta cancela un pisotón preparado. Son
            sustituciones explícitas del sistema de mano.
          </li>
          <li>
            <strong>Estados:</strong> Poison resta 2 PV por acumulación y salto.
            Speed± conserva el 20%; los multiplicadores condicionales conservan
            sus proporciones. Stun cancela el próximo ataque, Jinx impide
            críticos, Chill impide Último Aliento, Sleep permite ignorar escudo
            en el próximo golpe, Fragile duplica el daño al escudo y Scarab
            bloquea la curación.
          </li>
          <li>
            <strong>Último Aliento:</strong> dura 1,5 segundos tras un golpe
            mortal cuando quedan recursos o una condición lo garantiza; Chill y
            las cartas correspondientes lo bloquean o terminan. Es una
            conversión temporal del Last Stand.
          </li>
          <li>
            <strong>Objetivos:</strong> hay un asaltante. Las cartas que
            requieren varios enemigos no reciben objetivos ficticios. La clase
            del asaltante de prueba se elige en el editor para comprobar
            condiciones de clase.
          </li>
        </ul>
      </section>
      <section>
        <h2>Reglas móviles: un contacto, un reinicio</h2>
        <p>
          Las salas verticales usan carrera automática, un botón de salto y tres
          defensas. Tocar una trampa, su ataque o un charco resta 20 de salud y
          devuelve al inicio. El cofre entrega tantas Chispas como salud
          restante. Los cuerpos de las trampas permanecen visibles durante todo
          el ciclo.
        </p>
        <p>
          El modo Práctica elige entre ocho mapas diferentes y 52 combinaciones
          que cubren las 132 cartas. Cada una tiene una repetición sin golpes
          comprobada con la física real. Ver la ruta del bot no concede premios.
          Cambiar una defensa propia invalida su prueba; solo puedes compartirla
          tras llegar al cofre con 100 de salud.
        </p>
        <p>
          Las cartas de Classic son la referencia, pero el combate por turnos y
          las plataformas tienen reglas diferentes. No hay pisotones ofensivos,
          Poison acumulado después del contacto ni Último Aliento del jugador en
          este modo. Carrot dispara zanahorias; su recuperación de energía al
          romper escudo no se anuncia como activa aquí. El veneno de Grass Snake
          bloquea zonas de aterrizaje. Lagging obliga a esquivar una embestida
          en lugar de prometer ralentización después de reiniciar.
        </p>
        <p>
          Tomamos como referencia el espacio para moverse y la prevención de
          rutas imposibles de{' '}
          <a
            href="https://cleverendeavourgames.freshdesk.com/support/solutions/articles/32000028928-how-do-i-get-my-level-featured-in-the-game-"
            target="_blank"
            rel="noreferrer"
          >
            la guía oficial de Ultimate Chicken Horse
          </a>
          . La salud decreciente y el reinicio siguen la petición inspirada en
          King of Thieves.
        </p>
        <p>
          Chispas compra temas y adornos guardados en este dispositivo. Los
          pagos SLP, AXS, RON y USDC no están activos. Los retos se comparten
          por enlace y se verifican al abrirlos; todavía no hay clasificación ni
          economía en servidor.
        </p>
      </section>
      <section>
        <h2>Las 132 defensas, una por una</h2>
        <p>
          Datos de nivel 1 y adaptación implementada. A / E / C: ataque, escudo
          y coste de energía originales.
        </p>
        <div className="research-table">
          <table>
            <thead>
              <tr>
                <th>Parte y carta</th>
                <th>Clase / pieza</th>
                <th>A / E / C</th>
                <th>En WAXIS</th>
              </tr>
            </thead>
            <tbody>
              {PART_LIST.map((p) => (
                <tr key={p.id}>
                  <td>
                    <strong>{p.name}</strong>
                    <span>{p.card}</span>
                  </td>
                  <td>
                    {p.class}
                    <span>{p.slot}</span>
                  </td>
                  <td>
                    {p.attack} / {p.shield} / {p.energy}
                  </td>
                  <td>{raidPowerDescription(p.id)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
      <section>
        <h2>Fuentes y límites</h2>
        <ul>
          <li>
            <a href={CLASSIC_SOURCE} target="_blank" rel="noreferrer">
              Explorador oficial de cartas Classic
            </a>
            : cartas, estadísticas y condiciones vigentes consultadas.
          </li>
          <li>
            <a
              href="https://support.axieinfinity.com/hc/en-us/articles/20529260544027-Axie-Classic-How-to-Use-Axies"
              target="_blank"
              rel="noreferrer"
            >
              Guía oficial de Axies en Classic
            </a>
            : separación frente a Origins y selección de nivel de cartas.
          </li>
          <li>
            <a
              href="https://github.com/axieinfinity/mixer-playground/blob/c2288f76728bdb4881ef145a007307195800c07e/components/axie-figure/key.json"
              target="_blank"
              rel="noreferrer"
            >
              Mapa oficial de nombres de partes
            </a>
            : 279 nombres estándar y cosméticos documentados.
          </li>
          <li>
            <a
              href="https://github.com/axieinfinity/cc-axie-gtk2d/tree/1a446848bff0061334f32dcbd8f69ab9d36987b0/assets/axie-mixer/material/atlas-single"
              target="_blank"
              rel="noreferrer"
            >
              Atlas oficial
            </a>
            : sprites aislados con regiones, máscaras y paletas originales. Los
            derechos pertenecen a sus titulares.
          </li>
        </ul>
        <p>
          El balance podrá cambiar: el catálogo queda fijado a la fecha de
          consulta. El catálogo visual histórico no pretende enumerar todas las
          futuras skins. Los desbloqueos aceptan únicamente una carta base
          presente en los 132 registros verificados.
        </p>
      </section>
    </main>
  );
}
