/** @jsxImportSource preact */
import { navigation } from '~/routes/(components)/catalog';

export default function Menu() {
  return (
    <nav aria-label="Playground examples">
      <ul class="menu">
        <li class="menu-home">
          <a href="/">Home</a>
        </li>
        {navigation.map((group) => (
          <>
            <li class="menu-category">{group.name}</li>
            {group.items.map((item) => (
              <li>
                <a
                  href={item.href}
                  target={item.external ? '_blank' : undefined}
                  rel={item.external ? 'noopener' : undefined}>
                  {item.title}
                </a>
              </li>
            ))}
          </>
        ))}
      </ul>
    </nav>
  );
}
