import { test } from "@playwright/test"

test("debug: measure overflow dimensions at 320px", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 568 })
  await page.goto("/", { waitUntil: "networkidle" })

  const info = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const scrollWidth = document.documentElement.scrollWidth
    const bodyScrollWidth = document.body.scrollWidth
    const bodyClientWidth = document.body.clientWidth
    return { docWidth, scrollWidth, bodyScrollWidth, bodyClientWidth }
  })
  console.log("Dimensions:", JSON.stringify(info))

  // Find any element that contributes to horizontal scrollWidth
  const wide = await page.evaluate(() => {
    const docWidth = document.documentElement.clientWidth
    const elems: string[] = []
    for (const el of Array.from(document.querySelectorAll("*"))) {
      const style = window.getComputedStyle(el)
      const rect = el.getBoundingClientRect()
      // Check offsetLeft + offsetWidth > docWidth
      const htmlEl = el as HTMLElement
      if (htmlEl.offsetLeft !== undefined) {
        const right = htmlEl.offsetLeft + htmlEl.offsetWidth
        if (right > docWidth + 2) {
          elems.push(`<${el.tagName} offsetRight=${right} cls="${htmlEl.className?.toString().slice(0,60)}" txt="${el.textContent?.trim().slice(0,30)}"`)
        }
      }
    }
    return [...new Set(elems)].slice(0, 10)
  })
  console.log("Wide elements (by offset):", wide)
})
