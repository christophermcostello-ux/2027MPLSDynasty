import { createContext, useContext, useEffect, useState } from "react"

type FontSize = "small" | "medium" | "large"

type FontSizeProviderProps = {
  children: React.ReactNode
  defaultSize?: FontSize
  storageKey?: string
}

type FontSizeProviderState = {
  fontSize: FontSize
  setFontSize: (size: FontSize) => void
}

const initialState: FontSizeProviderState = {
  fontSize: "small",
  setFontSize: () => null,
}

const FontSizeProviderContext = createContext<FontSizeProviderState>(initialState)

export function FontSizeProvider({
  children,
  defaultSize = "small",
  storageKey = "vite-ui-font-size",
}: FontSizeProviderProps) {
  const [fontSize, setFontSize] = useState<FontSize>(
    () => (localStorage.getItem(storageKey) as FontSize) || defaultSize
  )

  useEffect(() => {
    const root = window.document.documentElement
    root.setAttribute("data-font-size", fontSize)
  }, [fontSize])

  const value = {
    fontSize,
    setFontSize: (size: FontSize) => {
      localStorage.setItem(storageKey, size)
      setFontSize(size)
    },
  }

  return (
    <FontSizeProviderContext.Provider value={value}>
      {children}
    </FontSizeProviderContext.Provider>
  )
}

export const useFontSize = () => {
  const context = useContext(FontSizeProviderContext)

  if (context === undefined)
    throw new Error("useFontSize must be used within a FontSizeProvider")

  return context
}
