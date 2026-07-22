<script lang="ts">
  import { navigation } from '~/routes/(components)/catalog';
</script>

<nav aria-label="Playground examples">
  <ul class="menu">
    <li class="menu-home"><a href="/">Home</a></li>
    {#each navigation as group}
      <li class="menu-category">{group.name}</li>
      {#each group.items as item}
        <li>
          <a
            href={item.href}
            target={item.external ? '_blank' : undefined}
            rel={item.external ? 'noopener' : undefined}>{item.title}</a
          >
        </li>
      {/each}
    {/each}
  </ul>
</nav>
