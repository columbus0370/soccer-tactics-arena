import { BrowserRouter, Routes, Route } from 'react-router-dom'
import LobbyPage from './pages/LobbyPage'
import TeamSelectPage from './pages/TeamSelectPage'
import MatchPage from './pages/MatchPage'
import ResultPage from './pages/ResultPage'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LobbyPage />} />
        <Route path="/team-select" element={<TeamSelectPage />} />
        <Route path="/match" element={<MatchPage />} />
        <Route path="/result" element={<ResultPage />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
