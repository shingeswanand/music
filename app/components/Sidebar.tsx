"use client";

import { useState } from "react";

import {
  FaBars,
  FaTimes,
  FaHome,
  FaHeart,
  FaSearch,
} from "react-icons/fa";

export default function Sidebar() {

  const [open, setOpen] =
    useState(false);

  return (
    <>
      {/* TOP NAVBAR */}
      <header className="fixed top-0 left-0 w-full h-16 bg-black/70 backdrop-blur-xl border-b border-gray-800 z-50">

        <div className="h-full px-4 md:px-8 flex items-center justify-between">

          {/* LEFT */}
          <div className="flex items-center gap-4">

            {/* MOBILE MENU */}
            <button
              onClick={() =>
                setOpen(true)
              }
              className="md:hidden text-white text-2xl"
            >
              <FaBars />
            </button>

            {/* LOGO */}
            <h1 className="text-green-500 text-3xl md:text-4xl font-bold">
              SMS Music
            </h1>
          </div>

          {/* RIGHT */}
          <div className="flex items-center gap-4">

            <button className="hidden sm:flex items-center gap-2 bg-[#1e1e1e] hover:bg-[#2a2a2a] transition px-4 py-2 rounded-full text-sm">

              <FaHeart className="text-red-500" />

              Favorites
            </button>

            <div className="w-10 h-10 rounded-full bg-green-500 flex items-center justify-center font-bold text-black">
              S
            </div>
          </div>
        </div>
      </header>

      {/* MOBILE OVERLAY */}
      {open && (
        <div
          onClick={() =>
            setOpen(false)
          }
          className="fixed inset-0 bg-black/70 z-40 md:hidden"
        />
      )}

      {/* MOBILE DRAWER */}
      <div
        className={`fixed top-0 left-0 h-screen w-72 bg-[#121212] border-r border-gray-800 z-50 p-6 transform transition-transform duration-300 md:hidden ${
          open
            ? "translate-x-0"
            : "-translate-x-full"
        }`}
      >

        {/* TOP */}
        <div className="flex items-center justify-between mb-10">

          <h1 className="text-green-500 text-4xl font-bold">
            SMS
          </h1>

          <button
            onClick={() =>
              setOpen(false)
            }
            className="text-white text-2xl"
          >
            <FaTimes />
          </button>
        </div>

        {/* MENU */}
        <nav className="flex flex-col gap-8 text-lg">

          <a
            href="#"
            className="flex items-center gap-4 hover:text-green-500 transition"
          >
            <FaHome />
            Home
          </a>

          <a
            href="#"
            className="flex items-center gap-4 hover:text-green-500 transition"
          >
            <FaSearch />
            Search
          </a>

          <a
            href="#"
            className="flex items-center gap-4 hover:text-green-500 transition"
          >
            <FaHeart />
            Favorites
          </a>
        </nav>
      </div>
    </>
  );
}