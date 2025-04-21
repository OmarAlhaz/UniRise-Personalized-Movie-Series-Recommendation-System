import { useState, useEffect } from 'react';
import './Login.css';
import logo from '../../assets/logo.png';
import { login, signup } from '../../firebase';
import unirise_spinner from '../../assets/unirise_spinner.gif';

const Login = () => {
  const [signState, setSignState] = useState("Sign In");
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [remember, setRemember] = useState(false);
  const [loading, setLoading] = useState(false);

  // On component mount, check if credentials are stored
  useEffect(() => {
    const storedRemember = localStorage.getItem('rememberMe');
    if (storedRemember === 'true') {
      const storedEmail = localStorage.getItem('email');
      const storedPassword = localStorage.getItem('password');
      if (storedEmail && storedPassword) {
        setEmail(storedEmail);
        setPassword(storedPassword);
        setRemember(true);
      }
    }
  }, []);

  const user_auth = async (event) => {
    event.preventDefault();
    setLoading(true);

    if (signState === 'Sign In') {
      await login(email, password);
    } else {
      await signup(name, email, password);
    }

    setLoading(false);

    // Save or remove credentials based on the "Remember Me" checkbox state
    if (remember) {
      localStorage.setItem('rememberMe', 'true');
      localStorage.setItem('email', email);
      localStorage.setItem('password', password);
    } else {
      localStorage.removeItem('rememberMe');
      localStorage.removeItem('email');
      localStorage.removeItem('password');
    }
  };

  return (
    loading ? (
      <div className="login-spinner">
        <img src={unirise_spinner} alt="Loading..." />
      </div>
    ) : (
      <div className='login'>
        <img src={logo} className='login-logo' alt="Logo" />
        <div className="login-form">
          <h1>{signState}</h1>
          <form>
            {signState === 'Sign Up' && (
              <input
                value={name}
                onChange={(e) => setName(e.target.value)}
                type="text"
                placeholder='Your name'
              />
            )}
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              placeholder='Email'
            />
            <input
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              placeholder='Password'
            />
            <button onClick={user_auth} type='submit'>{signState}</button>
            <div className="form-help">
              <div className="remember">
                <input
                  type="checkbox"
                  checked={remember}
                  onChange={(e) => setRemember(e.target.checked)}
                />
                <label>Remember Me</label>
              </div>
            </div>
          </form>
          <div className="form-switch">
            {signState === 'Sign In' ? (
              <p>
                New to UniRise? <span onClick={() => setSignState("Sign Up")}>Sign Up Now</span>
              </p>
            ) : (
              <p>
                Already have an account? <span onClick={() => setSignState("Sign In")}>Sign In Now</span>
              </p>
            )}
          </div>
        </div>
      </div>
    )
  );
};

export default Login;
