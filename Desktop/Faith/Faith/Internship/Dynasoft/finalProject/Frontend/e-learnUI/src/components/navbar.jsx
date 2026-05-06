import { useState } from "react";
import {
  FaFacebookF,
  FaTwitter,
  FaLinkedinIn,
  FaYoutube,
} from "react-icons/fa";
import { HiOutlineGlobeAlt } from "react-icons/hi";
import { Phone, Mail, Search, Menu, X } from "lucide-react";

const Navbar = () => {
  const [open, setOpen] = useState(false);

  return (
    <div className="w-full">

      {/* TOP BAR */}
      <div className="bg-primary text-white text-xs sm:text-sm px-4 sm:px-6 py-2 flex flex-col md:flex-row md:justify-between md:items-center gap-2">

        {/* Left info */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-6">
          <span>Kigali-Downtown, Rwanda</span>

          <span className="flex items-center gap-2">
            <Phone size={14} /> (+250) 794-381-611
          </span>

          <span className="flex items-center gap-2 break-all">
            <Mail size={14} /> email@example.com
          </span>
        </div>

        {/* Socials */}
        <div className="flex items-center gap-3 sm:gap-4 flex-wrap">
          <span className="text-xs">Follow:</span>
          <FaFacebookF className="cursor-pointer" />
          <FaTwitter className="cursor-pointer" />
          <FaLinkedinIn className="cursor-pointer" />
          <FaYoutube className="cursor-pointer" />
        </div>
      </div>

      {/* MAIN NAV */}
      <div className="bg-secondary px-4 sm:px-8 py-4 flex items-center justify-between">

        {/* LOGO */}
        <h1 className="text-xl font-bold text-textDark">
          Graspora
        </h1>

        {/* DESKTOP NAV */}
        <ul className="hidden md:flex gap-6 lg:gap-8 text-textDark font-medium text-sm lg:text-base">
          <li className="hover:text-primary cursor-pointer">Home</li>
          <li className="hover:text-primary cursor-pointer">About</li>
          <li className="hover:text-primary cursor-pointer">Courses</li>
          <li className="hover:text-primary cursor-pointer">Categories</li>
          <li className="hover:text-primary cursor-pointer">Dashboard</li>
          <li className="hover:text-primary cursor-pointer">Contact</li>
        </ul>

        {/* RIGHT SIDE (DESKTOP) */}
        <div className="hidden md:flex items-center gap-3 lg:gap-4">

          {/* Search + Language */}
          <div className="flex items-center gap-3">

            <div className="p-2 rounded-full bg-white shadow cursor-pointer">
              <Search size={16} />
            </div>

            <div className="p-2 rounded-full bg-white shadow flex items-center gap-1 cursor-pointer">
              <HiOutlineGlobeAlt size={16} />
              <span className="text-xs font-medium">EN</span>
            </div>
          </div>

          {/* Buttons */}
          <button className="text-sm font-medium text-gray-700 hover:text-primary">
            Login
          </button>

          <button className="bg-primary text-white px-3 lg:px-4 py-2 rounded-lg text-sm hover:opacity-90">
            Sign Up
          </button>
        </div>

        {/* MOBILE MENU BUTTON */}
        <button
          onClick={() => setOpen(!open)}
          className="md:hidden"
        >
          {open ? <X /> : <Menu />}
        </button>
      </div>

      {/* MOBILE MENU */}
      {open && (
        <div className="md:hidden bg-white px-4 py-4 shadow">

          <ul className="flex flex-col gap-4 text-gray-700 font-medium">
            <li>Home</li>
            <li>About</li>
            <li>Courses</li>
            <li>Categories</li>
            <li>Dashboard</li>
            <li>Contact</li>
          </ul>

          <div className="flex flex-col gap-3 mt-4">

            <div className="flex items-center gap-3">
              <Search size={16} />
              <span>Search</span>
            </div>

            <div className="flex items-center gap-3">
              <HiOutlineGlobeAlt size={16} />
              <span>EN</span>
            </div>

            <button className="text-left">Login</button>

            <button className="bg-primary text-white py-2 rounded-lg">
              Sign Up
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Navbar;