'use client'

import { useEffect, useState } from 'react'

interface Star {
  id: number
  x: number
  y: number
  size: number
  delay: number
}

export default function StarryBackground() {
  const [stars, setStars] = useState<Star[]>([])

  useEffect(() => {
    const generateStars = () => {
      const newStars: Star[] = []
      for (let i = 0; i < 100; i++) {
        newStars.push({
          id: i,
          x: Math.random() * 100,
          y: Math.random() * 100,
          size: Math.random() * 3 + 1,
          delay: Math.random() * 3,
        })
      }
      setStars(newStars)
    }

    generateStars()
  }, [])

  return (
    <div className="starry-bg">
      {stars.map((star) => (
        <div
          key={star.id}
          className="star absolute bg-white rounded-full animate-twinkle"
          style={{
            left: `${star.x}%`,
            top: `${star.y}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            animationDelay: `${star.delay}s`,
          }}
        />
      ))}

      {/* 流星效果 */}
      <div className="absolute top-1/4 left-1/4 w-1 h-1 bg-white rounded-full animate-ping"
           style={{ animationDuration: '4s', animationDelay: '2s' }} />
      <div className="absolute top-3/4 right-1/3 w-1 h-1 bg-seth-gold rounded-full animate-ping"
           style={{ animationDuration: '6s', animationDelay: '4s' }} />
    </div>
  )
}