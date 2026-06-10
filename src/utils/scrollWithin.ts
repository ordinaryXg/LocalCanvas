export function findScrollParent(el: HTMLElement | null): HTMLElement | null {
  let node = el?.parentElement ?? null
  while (node) {
    const { overflowY } = getComputedStyle(node)
    if (overflowY === 'auto' || overflowY === 'scroll') return node
    node = node.parentElement
  }
  return null
}

export function scrollElementWithinContainer(
  container: HTMLElement,
  target: HTMLElement,
  behavior: ScrollBehavior = 'smooth',
): void {
  const containerRect = container.getBoundingClientRect()
  const targetRect = target.getBoundingClientRect()
  const top = targetRect.top - containerRect.top + container.scrollTop
  const bottom = top + targetRect.height
  const viewTop = container.scrollTop
  const viewBottom = viewTop + container.clientHeight

  if (top < viewTop) {
    container.scrollTo({ top, behavior })
  } else if (bottom > viewBottom) {
    container.scrollTo({ top: bottom - container.clientHeight, behavior })
  }
}
