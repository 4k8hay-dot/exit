import { NavLink, Link } from 'react-router-dom'

const Navbar = ({ currentPath }) => {
  return (
    <header className="site-header">
      <Link className="brand" to="/" aria-label="Coursekind home">
        <span className="brand-mark" aria-hidden="true">✳</span>
        <span>course<span>kind</span></span>
      </Link>
      <nav className="main-nav" aria-label="Main navigation">
        <NavLink to="/" end className={({ isActive }) => `nav-link ${isActive ? 'nav-link-active' : ''}`}>
          Dashboard
        </NavLink>
        <NavLink to="/add-feedback" className={({ isActive }) => `nav-link ${isActive || currentPath.startsWith('/feedback/') ? 'nav-link-active' : ''}`}>
          Add feedback <span className="nav-plus" aria-hidden="true">+</span>
        </NavLink>
      </nav>
      <div className="header-note"><span className="online-dot" /> LEARNING, TOGETHER</div>
    </header>
  )
}
export default Navbar